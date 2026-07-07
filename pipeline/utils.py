"""Tiện ích chung: đường dẫn, thời gian VN, đọc/ghi JSON."""
import json, os
from datetime import datetime, timezone, timedelta

VN_TZ = timezone(timedelta(hours=7))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CONFIG = json.load(open(os.path.join(ROOT, "config", "radar.json"), encoding="utf-8"))

def now_vn():
    return datetime.now(VN_TZ)

def today_str():
    return now_vn().strftime("%Y-%m-%d")

def load_json(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default

def save_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)

def data_path(name):
    return os.path.join(DATA, name)
