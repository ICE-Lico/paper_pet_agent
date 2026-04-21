import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

if getattr(sys, 'frozen', False):
    if os.name == 'nt':
        CONFIG_DIR = Path(os.getenv('APPDATA', Path.home() / '.paper_pet_agent'))
    else:
        CONFIG_DIR = Path.home() / '.paper_pet_agent'
else:
    CONFIG_DIR = Path(__file__).resolve().parent.parent

CONFIG_DIR.mkdir(parents=True, exist_ok=True)
CONFIG_PATH = CONFIG_DIR / "user_config.json"

dotenv_path = Path(__file__).resolve().parent.parent / ".env"
if dotenv_path.exists():
    load_dotenv(dotenv_path=dotenv_path)
else:
    load_dotenv()


def read_user_config() -> dict:
    if not CONFIG_PATH.exists():
        return {}

    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8")) or {}
    except Exception:
        return {}


def save_user_config(config: dict) -> dict:
    current = read_user_config()
    current.update({k: v for k, v in config.items() if v is not None})
    CONFIG_PATH.write_text(json.dumps(current, indent=2, ensure_ascii=False), encoding="utf-8")
    return current


def get_config() -> dict:
    user_config = read_user_config()
    return {
        "OPENAI_API_KEY": user_config.get("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY"),
        "OPENAI_BASE_URL": user_config.get("OPENAI_BASE_URL") or os.getenv("OPENAI_BASE_URL"),
        "MODEL_NAME": user_config.get("MODEL_NAME") or os.getenv("MODEL_NAME") or "deepseek-chat",
    }
