from app.services.llm_service import call_llm


def related_paper_agent(paper_text: str) -> str:
    system_prompt = "你是一个专业的学术研究助手，擅长根据论文内容发散相关研究方向和检索关键词。"

    user_prompt = f"""
请基于下面这篇论文的内容，给出：

1. 3个值得进一步阅读的相关研究方向
2. 3到5个适合继续检索论文的英文关键词

要求：
1. 用中文输出“相关研究方向”
2. 英文关键词单独列出
3. 不要编造具体论文标题
4. 输出格式清晰，便于程序后续处理

请严格按照下面格式输出：

相关研究方向：
1. ...
2. ...
3. ...

检索关键词：
1. ...
2. ...
3. ...
4. ...
5. ...

论文内容：
{paper_text}
"""

    return call_llm(system_prompt, user_prompt)