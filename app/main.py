import io
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.agents.contribution_agent import contribution_agent
from app.agents.qa_agent import qa_agent
from app.agents.related_paper_agent import related_paper_agent
from app.agents.summary_agent import summary_agent
from app.config import get_config, save_user_config
from app.models.schemas import AnalyzeRequest, AskRequest, ConfigRequest
from app.rag.chunker import chunk_text
from app.rag.embedder import embed_documents, embed_query
from app.rag.vector_store import SimpleVectorStore
from app.services.llm_service import call_llm

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

current_paper = None
current_chunks = []
current_vector_store = None


def parse_contributions(contribution_text: str) -> list[str]:
    results = []

    for raw_line in contribution_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        for prefix in ("1.", "2.", "3.", "4.", "5.", "-", "•"):
            if line.startswith(prefix):
                line = line[len(prefix):].strip()
                break

        if line:
            results.append(line)

    return results


def parse_related_output(output_text: str) -> dict:
    topics = []
    keywords = []
    current_section = None

    for raw_line in output_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        if line.startswith("相关研究方向"):
            current_section = "topics"
            continue

        if line.startswith("检索关键词"):
            current_section = "keywords"
            continue

        for prefix in ("1.", "2.", "3.", "4.", "5."):
            if line.startswith(prefix):
                item = line[len(prefix):].strip()
                if current_section == "topics":
                    topics.append(item)
                elif current_section == "keywords":
                    keywords.append(item)
                break

    return {"topics": topics, "keywords": keywords}


@app.get("/")
def read_root():
    return {"message": "Paper Pet Agent backend is running!"}


@app.post("/analyze")
def analyze_paper(request: AnalyzeRequest):
    try:
        summary = summary_agent(request.text)
        contributions_text = contribution_agent(request.text)
        contributions = parse_contributions(contributions_text)
        return {"summary": summary, "contributions": contributions}
    except Exception as exc:
        return {"error": str(exc)}


@app.post("/ask")
def ask_question(request: AskRequest):
    try:
        global current_vector_store

        if current_vector_store is None:
            return {"error": "请先调用 /load_paper 加载论文。"}

        query_embedding = embed_query(request.question)
        retrieved_chunks = current_vector_store.search(query_embedding, top_k=3)
        answer = qa_agent(retrieved_chunks, request.question)
        return {"answer": answer, "retrieved_chunks": retrieved_chunks}
    except Exception as exc:
        return {"error": str(exc)}


@app.post("/related")
def get_related_directions(request: AnalyzeRequest):
    try:
        raw_output = related_paper_agent(request.text)
        return parse_related_output(raw_output)
    except Exception as exc:
        return {"error": str(exc)}


@app.post("/load_paper")
def load_paper(request: AnalyzeRequest):
    global current_paper, current_chunks, current_vector_store

    current_paper = request.text
    current_chunks = chunk_text(current_paper, chunk_size=500, overlap=100)

    if not current_chunks:
        return {"error": "论文内容为空，无法加载。"}

    embeddings = embed_documents(current_chunks)
    dimension = len(embeddings[0])

    current_vector_store = SimpleVectorStore(dimension)
    current_vector_store.add(embeddings, current_chunks)

    return {
        "message": "论文加载成功。",
        "chunk_count": len(current_chunks),
    }


@app.get("/config")
def read_config():
    config = get_config()
    return {
        "api_key_set": bool(config.get("OPENAI_API_KEY")),
        "base_url": config.get("OPENAI_BASE_URL") or "",
        "model_name": config.get("MODEL_NAME") or "deepseek-chat",
    }


@app.post("/config")
def update_config(request: ConfigRequest):
    save_user_config(
        {
            "OPENAI_API_KEY": request.api_key,
            "OPENAI_BASE_URL": request.base_url,
            "MODEL_NAME": request.model_name,
        }
    )
    return {"success": True}


def detect_intent(question: str) -> str:
    prompt = f"""
请判断用户的问题属于哪一类，只能返回一个单词：

summary
contribution
related
qa

用户问题：
{question}
"""

    result = call_llm("你是一个分类助手。", prompt)
    intent = result.strip().lower()

    if "summary" in intent:
        return "summary"
    if "contribution" in intent:
        return "contribution"
    if "related" in intent:
        return "related"
    return "qa"


@app.post("/chat")
def chat(request: AskRequest):
    try:
        global current_paper, current_vector_store

        if not current_paper:
            return {"error": "请先加载论文。"}

        intent = detect_intent(request.question)

        if intent == "summary":
            return {"answer": summary_agent(current_paper)}

        if intent == "contribution":
            text = contribution_agent(current_paper)
            return {"answer": "\n".join(parse_contributions(text))}

        if intent == "related":
            raw = related_paper_agent(current_paper)
            parsed = parse_related_output(raw)
            return {"answer": "\n".join(parsed["topics"])}

        if current_vector_store is None:
            return {"error": "请先调用 /load_paper 加载论文。"}

        query_embedding = embed_query(request.question)
        chunks = current_vector_store.search(query_embedding, top_k=3)
        answer = qa_agent(chunks, request.question)
        return {"answer": answer}
    except Exception as exc:
        return {"error": str(exc)}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
