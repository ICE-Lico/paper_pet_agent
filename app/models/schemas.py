from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    text: str


class AskRequest(BaseModel):
    question: str


class ConfigRequest(BaseModel):
    api_key: str | None = None
    base_url: str | None = None
    model_name: str | None = None
