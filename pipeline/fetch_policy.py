"""Cron SÁNG 7:00 VN — quét văn bản/tin chính sách qua đêm, tóm tắt bằng Gemini.
Nguyên tắc: Gemini chỉ TÓM TẮT + GẮN NHÓM + ĐỀ XUẤT mức ảnh hưởng. Không tự đổi 🟠/🔴.
v1.1 — VÁ BẢO MẬT: key chuyển vào header (không lộ qua URL/log Actions), tẩy key
  khỏi mọi thông báo lỗi trước khi ghi ra ghi_chu, tự chờ rồi thử lại khi bị 429."""
import os, time, requests, feedparser
from utils import CONFIG, save_json, load_json, data_path, today_str, now_vn

FEEDS = [
    ("baochinhphu", "https://baochinhphu.vn/rss/kinh-te.rss"),
    ("xdcs", "https://xaydungchinhsach.chinhphu.vn/rss/home.rss"),
]
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
# gemini-2.0-flash bị Google tắt 01/06/2026 → đổi sang gemini-2.5-flash (free tier
# 10 RPM, 250 RPD, sống đến 16/10/2026 — xem QUY ƯỚC CODE trong CLAUDE.md).
GEMINI_URL = ("https://generativelanguage.googleapis.com/v1beta/models/"
              "gemini-2.5-flash:generateContent")
CHO_KHI_BI_CHAN = 65     # hết cửa sổ rate limit Gemini, giống quy ước fetch_market.py
SO_LAN_THU = 3
NHOM = {k: v["ten"] for k, v in CONFIG["nhom_nganh"].items()}

PROMPT = """Bạn là bộ lọc tin chính sách cho hệ thống radar đầu tư trung hạn 6-18 tháng tại VN.
Nhóm ngành theo dõi: {nhom}.
Với danh sách tiêu đề tin dưới đây, trả về JSON thuần (không markdown) dạng:
{{"tin_lien_quan": [{{"tieu_de": "...", "nhom": "id-nhom", "muc_do": "theo-doi|trong-yeu",
"ly_do": "1 câu", "loai": "du-thao|ban-hanh|thuc-thi|khac"}}]}}
CHỈ giữ tin về nghị quyết/luật/quy hoạch/thông tư/giải ngân/cơ chế giá có ảnh hưởng các nhóm trên.
Bỏ qua tin sự vụ, tin doanh nghiệp đơn lẻ, tin giật gân. Nếu không có tin nào: {{"tin_lien_quan": []}}
DANH SÁCH TIN:
{tin}"""

def get_headlines():
    items = []
    for name, url in FEEDS:
        try:
            feed = feedparser.parse(url)
            for e in feed.entries[:25]:
                items.append({"nguon": name, "tieu_de": e.get("title", ""), "link": e.get("link", "")})
        except Exception as ex:
            items.append({"nguon": name, "tieu_de": f"[LỖI FEED: {ex}]", "link": ""})
    return items

def _tay_key(msg):
    """Tẩy GEMINI_API_KEY khỏi thông báo lỗi trước khi ghi vào ghi_chu/log."""
    s = str(msg)
    return s.replace(GEMINI_KEY, "***") if GEMINI_KEY else s

def gemini_filter(items):
    if not GEMINI_KEY:
        return {"tin_lien_quan": [], "ghi_chu": "Thiếu GEMINI_API_KEY — bỏ qua lọc AI"}
    tin_txt = "\n".join(f"- {i['tieu_de']}" for i in items if i["tieu_de"])
    body = {"contents": [{"parts": [{"text": PROMPT.format(nhom=NHOM, tin=tin_txt)}]}]}
    headers = {"Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY}
    for lan in range(1, SO_LAN_THU + 1):
        try:
            r = requests.post(GEMINI_URL, json=body, headers=headers, timeout=60)
            if r.status_code == 429:
                if lan < SO_LAN_THU:
                    print(f"Gemini: chạm rate limit, chờ {CHO_KHI_BI_CHAN}s (lần {lan})...")
                    time.sleep(CHO_KHI_BI_CHAN)
                    continue
                return {"tin_lien_quan": [], "ghi_chu": "Lỗi Gemini: hết lượt thử lại (429 - rate limit)"}
            r.raise_for_status()
            text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
            import json as _j
            text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            return _j.loads(text)
        except Exception as e:
            return {"tin_lien_quan": [], "ghi_chu": f"Lỗi Gemini: {_tay_key(e)}"}

def main():
    items = get_headlines()
    ket_qua = gemini_filter(items)
    # gắn lại link theo tiêu đề
    link_map = {i["tieu_de"]: i["link"] for i in items}
    for t in ket_qua.get("tin_lien_quan", []):
        t["link"] = link_map.get(t.get("tieu_de", ""), "")
    out = {"ngay": today_str(), "cap_nhat": now_vn().isoformat(),
           "tong_tin_quet": len(items), **ket_qua}
    save_json(data_path("policy-latest.json"), out)
    print(f"Quét {len(items)} tin, liên quan: {len(out.get('tin_lien_quan', []))}")

if __name__ == "__main__":
    main()
