"""Đẩy báo cáo về Telegram. Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, DASHBOARD_URL.
v1.1 — VÁ BẢO MẬT: tẩy token khỏi thông báo lỗi (token nằm sẵn trong URL Telegram
  API, không có cách truyền qua header), tự chờ rồi thử lại khi bị 429."""
import os, time, requests
from utils import data_path

SO_LAN_THU = 3

def _tay_token(msg, token):
    """Tẩy TELEGRAM_BOT_TOKEN khỏi thông báo lỗi trước khi in/raise."""
    s = str(msg)
    return s.replace(token, "***") if token else s

def send(text=None):
    token = os.environ["TELEGRAM_BOT_TOKEN"]
    chat = os.environ["TELEGRAM_CHAT_ID"]
    url_dash = os.environ.get("DASHBOARD_URL", "")
    if text is None:
        text = open(data_path("report-latest.txt"), encoding="utf-8").read()
    if url_dash and url_dash != "None":
        lines = text.split("\n")
        lines.append(f"📊 Chi tiết: {url_dash}")
        text = "\n".join(lines[:15])
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    for lan in range(1, SO_LAN_THU + 1):
        try:
            r = requests.post(url, json={"chat_id": chat, "text": text, "disable_web_page_preview": True},
                              timeout=30)
            if r.status_code == 429:
                try:
                    cho = r.json().get("parameters", {}).get("retry_after", 5)
                except Exception:
                    cho = 5
                if lan < SO_LAN_THU:
                    print(f"Telegram: chạm rate limit, chờ {cho}s (lần {lan})...")
                    time.sleep(cho)
                    continue
                raise RuntimeError("hết lượt thử lại (429 - rate limit)")
            r.raise_for_status()
            print("Đã gửi Telegram")
            return
        except requests.exceptions.RequestException as e:
            raise RuntimeError(_tay_token(e, token)) from None

if __name__ == "__main__":
    send()
