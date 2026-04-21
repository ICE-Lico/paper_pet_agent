from app.services.llm_service import call_llm


def contribution_agent(paper_text: str) -> str:
    system_prompt = "你是一个专业的论文分析助手，擅长提炼论文的创新点和贡献。"
    user_prompt = f"""
请阅读下面的论文内容，提炼这篇论文的2到3个核心创新点。

要求：
1. 用中文输出
2. 每个创新点单独占一行
3. 每行前面加数字编号，例如 1. 2. 3.
4. 每点尽量简洁
5. 不要编造论文里没有的信息

论文内容：
{paper_text}
"""
    return call_llm(system_prompt, user_prompt)