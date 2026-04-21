from app.services.llm_service import call_llm


def summary_agent(paper_text: str) -> str:
    system_prompt = "你是一个专业的论文总结助手，擅长用简洁清晰的中文总结学术论文。"
    user_prompt = f"""
请阅读下面的论文内容，并用简洁中文总结这篇论文的核心内容。

要求：
1. 只输出一段总结
2. 控制在3到5句话
3. 不要分点
4. 不要编造论文里没有的信息

论文内容：
{paper_text}
"""
    return call_llm(system_prompt, user_prompt)