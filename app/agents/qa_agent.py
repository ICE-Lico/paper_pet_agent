from app.services.llm_service import call_llm


def qa_agent(paper_text: str | list[str], question: str) -> str:
    system_prompt = "你是一个专业的论文问答助手，擅长根据论文内容回答问题。"

    if isinstance(paper_text, list):
        paper_content = "\n\n".join(paper_text)
    else:
        paper_content = paper_text

    user_prompt = f"""
请基于下面提供的论文内容，回答用户的问题。

要求：
1. 只能基于论文内容回答
2. 如果论文中没有相关信息，请明确说明“论文中未提及”
3. 回答要清晰、有逻辑
4. 用中文回答

论文内容：
{paper_content}

用户问题：
{question}
"""

    return call_llm(system_prompt, user_prompt)