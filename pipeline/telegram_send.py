"""Đẩy báo cáo về Telegram. Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, DASHBOARD_URL."""
import os, requests
from utils import data_path

def send(text=None):
    token = os.environ["TELEGRAM_BOT_TOKEN"]
    chat = os.environ["TELEGRAM_CHAT_ID"]
    url_dash = os.environ.get("DASHBOARD_URL", "")
    if text is None:
        text = open(data_path("report-latest.txt"), encoding="utf-8").read()
    text = text.replace("<DASHBOARD_URL>", url_dash)
    r = requests.post(f"https://api.telegram.org/bot{token}/sendMessage",
                      json={"chat_id": chat, "text": text, "disable_web_page_preview": True},
                      timeout=30)
    r.raise_for_status()
    print("Đã gửi Telegram")

if __name__ == "__main__":
    send()
