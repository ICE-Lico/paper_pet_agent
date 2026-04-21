from openai import OpenAI

from app.config import get_config


def call_llm(system_prompt: str, user_prompt: str) -> str:
    config = get_config()
    api_key = config.get("OPENAI_API_KEY")
    base_url = config.get("OPENAI_BASE_URL")
    model_name = config.get("MODEL_NAME") or "deepseek-chat"

    print("开始调用 LLM")
    print("OPENAI_API_KEY set:", bool(api_key))
    print("OPENAI_BASE_URL:", base_url)
    print("MODEL_NAME:", model_name)

    if not api_key:
        raise ValueError("OPENAI_API_KEY 未设置，请先在界面里填写并保存 DeepSeek API Key。")

    client = OpenAI(api_key=api_key, base_url=base_url)

    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            timeout=10,
        )
        print("LLM 返回成功")
        return response.choices[0].message.content
    except Exception as exc:
        print("LLM 调用异常:", repr(exc))
        raise
