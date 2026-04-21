from sentence_transformers import SentenceTransformer

model = None


def get_model():
    global model
    if model is None:
        print("正在加载 embedding 模型，请稍等...")
        model = SentenceTransformer("BAAI/bge-small-en-v1.5")
    return model


def embed_documents(texts: list[str]):
    current_model = get_model()
    return current_model.encode_document(texts, normalize_embeddings=True)


def embed_query(query: str):
    current_model = get_model()
    return current_model.encode_query(query, normalize_embeddings=True)