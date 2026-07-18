"""Sinh feedback/pending-tasks.json (schema mục 5.1 SPEC-app-danh-gia-v1.md) —
chạy cuối morning.yml, sau report.py/telegram_send.py. Chỉ tạo NHIỆM VỤ ĐÁNH GIÁ
cho con người (app đọc, hiển thị trong hộp nhiệm vụ) — KHÔNG tự đổi trạng thái
🟠/🔴 và không tự phát khuyến nghị mua/bán (nguyên tắc #1 CLAUDE.md). Task
review_proposal chỉ nhắc con người mở knowledge/ kiểm tra chân chính sách trước
khi tự tay sửa config/radar.json.

Ngưỡng "tín hiệu vượt ngưỡng" lấy trực tiếp từ app/src/lib/constants.js (mức
"khoe" trong SIGNAL_LEVELS + SCORE_RAW_MAX) bằng regex — không hard-code lại số
ở đây để khỏi trôi so với dải tín hiệu sống hiển thị trong app. Đổi ngưỡng thì
sửa constants.js, script này tự đọc lại ở lần chạy sau.

review_proposal chỉ sinh khi ĐỦ CẢ HAI: (a) điểm vượt ngưỡng "khoe" theo
constants.js, VÀ (b) de_xuat_may != trang_thai_nguoi_duyet trong radar-latest.json
(tức máy và người CHƯA khớp trạng thái — còn cái để duyệt thật). Nhóm điểm cao
nhưng đã được duyệt khớp rồi (vd trang_thai=cam, de_xuat=cam) thì không tạo task
nữa — tránh nhắc lại việc đã xong (nguyên tắc #3 chống nhiễu, CLAUDE.md).

payload mở rộng (3 lớp hiển thị trong app, xem app/src/components/*):
deltaVsYesterday, scoreHistory (0-10, tối đa 7 điểm), topNews ([{title,source,
link}]), sectors ([{name,scoreToday,scoreYesterday,delta}] — TOÀN BỘ nhóm, dùng
chung cho mọi task vì Lớp 2 là bảng so sánh cả thị trường, không riêng 1 ngành).
Với review_proposal: deltaVsYesterday/scoreHistory là của riêng nhóm đó;
topNews lọc theo đúng nhóm (rỗng nếu không có tin liên quan — không nhét tin
ngành khác cho đủ số). Với morning_feedback (không gắn 1 nhóm cụ thể):
deltaVsYesterday/scoreHistory dùng điểm CAO NHẤT toàn thị trường mỗi phiên (đại
diện "tín hiệu nổi bật nhất"); topNews lấy top tin chung của báo cáo sáng.
Không đổi schema — payload vẫn là object mở theo mục 5.1 SPEC.
"""
import os
import re
from datetime import datetime, timedelta
from urllib.parse import urlparse

from utils import CONFIG, ROOT, load_json, save_json, data_path, today_str, now_vn

FEEDBACK_DIR = os.path.join(ROOT, "feedback")
CONSTANTS_JS = os.path.join(ROOT, "app", "src", "lib", "constants.js")
EMOJI = CONFIG["trang_thai_map"]

MORNING_TTL_HOURS = 20   # hết hạn trước khi cron sáng hôm sau tạo bản mới
PROPOSAL_TTL_DAYS = 7    # khớp trần lựa chọn "Hoãn" dài nhất trong app (1 tuần)
RADAR_FNAME_RE = re.compile(r"^radar-(\d{4}-\d{2}-\d{2})\.json$")
SCORE_HISTORY_LEN = 7


def feedback_path(name):
    return os.path.join(FEEDBACK_DIR, name)


def doc_nguong_khoe():
    """Đọc SCORE_RAW_MAX + ngưỡng mức 'khoe' từ app/src/lib/constants.js. Nếu
    không đọc được (file thiếu/đổi cấu trúc) thì lùi về giá trị mặc định đang
    dùng trong app lúc viết script này, kèm cảnh báo ra log — không crash."""
    try:
        src = open(CONSTANTS_JS, encoding="utf-8").read()
        m_scale = re.search(r"SCORE_RAW_MAX\s*=\s*(\d+)", src)
        m_khoe = re.search(r'key:\s*"khoe".*?min:\s*(-?[\d.]+)', src, re.S)
        if not (m_scale and m_khoe):
            raise ValueError("không tìm thấy SCORE_RAW_MAX hoặc ngưỡng 'khoe'")
        return float(m_scale.group(1)), float(m_khoe.group(1))
    except Exception as e:
        print(f"⚠️ Không đọc được ngưỡng từ constants.js ({e}) — dùng mặc định 40/7.0")
        return 40.0, 7.0


def parse_iso(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def latest_decision(decisions, signal_id):
    entries = [e for e in decisions.get("entries", []) if e.get("signalId") == signal_id]
    if not entries:
        return None
    return max(entries, key=lambda e: e.get("decidedAt", ""))


def context_morning(report, today):
    if report.get("du_lieu_cu"):
        return f"Báo cáo sáng {today}: dữ liệu thị trường cũ, radar tạm khóa — tin chính sách hôm nay có đáng chú ý không?"
    n_tin = len(report.get("tin_chinh_sach", []))
    n_dt = len(report.get("dong_tien_noi_bat", []))
    flags = report.get("flags", [])
    if n_tin == 0 and n_dt == 0:
        return (f"Báo cáo sáng {today}: không có tin chính sách hay dòng tiền nổi bật nào. "
                "Xác nhận đây đúng là ngày yên tĩnh, không phải bộ lọc bỏ sót tin.")
    phan = []
    if n_tin:
        phan.append(f"{n_tin} tin chính sách")
    if n_dt:
        phan.append(f"{n_dt} dòng tiền nổi bật")
    ctx = f"Báo cáo sáng {today}: {', '.join(phan)}"
    if flags:
        ctx += f", {len(flags)} cảnh báo hệ thống"
    ctx += ". Tin có đáng chú ý, có đúng trọng tâm ngành theo dõi không?"
    return ctx


def score10(diem, scale_max):
    return round(diem / scale_max * 10, 1) if diem is not None else None


def load_radar_history(limit=8):
    """Đọc các file data/radar-YYYY-MM-DD.json đã có (kể cả bản hôm nay — scoring.py
    luôn lưu trùng với radar-latest.json), sắp xếp tăng dần theo ngày, lấy tối đa
    `limit` bản gần nhất — dùng tính scoreHistory/deltaVsYesterday cho payload."""
    data_dir = os.path.join(ROOT, "data")
    found = []
    for fname in os.listdir(data_dir):
        m = RADAR_FNAME_RE.match(fname)
        if m:
            found.append((m.group(1), fname))
    found.sort()
    hist = []
    for date, fname in found[-limit:]:
        d = load_json(os.path.join(data_dir, fname))
        if d:
            hist.append((date, d))
    return hist


def build_sectors_map(radar, yesterday_data, scale_max):
    """{nid: {name, scoreToday, scoreYesterday, delta}} cho TOÀN BỘ nhóm — dùng
    chung cho bảng Lớp 2 của mọi task, và để tra deltaVsYesterday riêng từng nhóm."""
    yesterday_nhom = (yesterday_data or {}).get("nhom", {})
    out = {}
    for nid, n in radar.get("nhom", {}).items():
        today_s = score10(n.get("diem_dong_tien_max"), scale_max)
        yday_s = score10(yesterday_nhom.get(nid, {}).get("diem_dong_tien_max"), scale_max)
        delta = round(today_s - yday_s, 1) if today_s is not None and yday_s is not None else None
        out[nid] = {"name": n.get("ten", nid), "scoreToday": today_s, "scoreYesterday": yday_s, "delta": delta}
    return out


def score_history_for(history, scale_max, nid=None, limit=SCORE_HISTORY_LEN):
    """Chuỗi điểm 0-10 gần nhất cho sparkline. nid=None → điểm CAO NHẤT toàn thị
    trường mỗi phiên (đại diện morning_feedback, không gắn 1 nhóm cụ thể)."""
    out = []
    for _date, d in history:
        nhom = d.get("nhom", {})
        if nid is not None:
            s = score10(nhom.get(nid, {}).get("diem_dong_tien_max"), scale_max)
        else:
            diems = [n.get("diem_dong_tien_max") for n in nhom.values() if n.get("diem_dong_tien_max") is not None]
            s = score10(max(diems), scale_max) if diems else None
        if s is not None:
            out.append(s)
    return out[-limit:]


def news_source(link):
    """Suy ra tên nguồn tin từ domain link — tin_lien_quan (fetch_policy.py) không
    lưu sẵn trường 'nguon' nên không có cách nào khác ngoài suy từ URL."""
    if not link:
        return ""
    try:
        host = urlparse(link).netloc
        return host[4:] if host.startswith("www.") else host
    except Exception:
        return ""


def build_top_news(tin_list, nid=None, limit=3):
    """Tối đa `limit` tin {title, source, link}. Với nid cụ thể: chỉ lấy tin đã
    được Gemini gắn đúng nhóm đó — không có thì để rỗng, không nhét tin ngành khác."""
    items = [t for t in tin_list if t.get("nhom") == nid] if nid is not None else tin_list
    return [{"title": t.get("tieu_de", ""), "source": news_source(t.get("link", "")), "link": t.get("link", "")}
            for t in items[:limit]]


def build():
    now = now_vn()
    today = today_str()
    scale_max, khoe_min = doc_nguong_khoe()

    report = load_json(data_path("report-latest.json"), {})
    radar = load_json(data_path("radar-latest.json"), {"nhom": {}, "ngay": today})
    pending = load_json(feedback_path("pending-tasks.json"), {"schemaVersion": "1.0", "tasks": []})
    decisions = load_json(feedback_path("decisions.json"), {"schemaVersion": "1.0", "entries": []})

    # Dữ liệu cho payload mở rộng 3 lớp (xem docstring đầu file)
    history = load_radar_history(limit=SCORE_HISTORY_LEN + 1)
    today_ngay = radar.get("ngay", today)
    ngay_truoc = [(d, h) for d, h in history if d < today_ngay]
    yesterday_data = ngay_truoc[-1][1] if ngay_truoc else None
    sectors_map = build_sectors_map(radar, yesterday_data, scale_max)
    sectors_list = list(sectors_map.values())
    tin_list = report.get("tin_chinh_sach", [])
    overall_history = score_history_for(history, scale_max, nid=None)
    overall_delta = (round(overall_history[-1] - overall_history[-2], 1)
                      if len(overall_history) >= 2 else None)

    # 1) Dọn task hết hạn (expiresAt < bây giờ) — nguyên tắc "task cũ hết hạn thì loại khỏi file"
    tasks = []
    for t in pending.get("tasks", []):
        exp = t.get("expiresAt")
        try:
            con_han = not exp or parse_iso(exp) > now
        except Exception:
            con_han = True  # expiresAt hỏng định dạng — giữ lại, không xóa nhầm
        if con_han:
            tasks.append(t)
    existing_ids = {t["id"] for t in tasks}
    open_proposal_signals = {t["signalId"] for t in tasks if t.get("type") == "review_proposal"}

    # 2) morning_feedback — 1 task/ngày, id gắn ngày nên rerun cùng ngày không trùng
    morning_id = f"task-{today.replace('-', '')}-morning"
    if morning_id not in existing_ids and report:
        ctx = context_morning(report, today)
        tasks.append({
            "id": morning_id,
            "type": "morning_feedback",
            "signalId": None,
            "context": ctx,
            "payload": {
                "score": None, "layer": None, "confidence": None, "summary": ctx,
                "deltaVsYesterday": overall_delta,
                "scoreHistory": overall_history,
                "topNews": build_top_news(tin_list),
                "sectors": sectors_list,
            },
            "createdAt": now.isoformat(),
            "expiresAt": (now + timedelta(hours=MORNING_TTL_HOURS)).isoformat(),
        })

    # 3) review_proposal — nhóm có dòng tiền vượt ngưỡng "khoe" (quy đổi 0-10 theo constants.js)
    for nid, n in radar.get("nhom", {}).items():
        diem = n.get("diem_dong_tien_max")
        if diem is None:
            continue  # radar khóa (data cũ) hoặc chưa mã nào qua lọc thanh khoản — không đủ căn cứ
        score_now = score10(diem, scale_max)
        if score_now < khoe_min:
            continue
        if n.get("de_xuat_may") == n.get("trang_thai_nguoi_duyet"):
            continue  # máy và người đã khớp trạng thái — không có gì để duyệt, khỏi nhắc lại (nguyên tắc #3)
        signal_id = f"sig-{nid}"
        if signal_id in open_proposal_signals:
            continue  # đã có task mở cho nhóm này — khỏi tạo trùng

        dec = latest_decision(decisions, signal_id)
        if dec:
            if dec.get("decision") in ("approve", "reject") and dec.get("decidedAt", "") >= radar.get("ngay", ""):
                continue  # đã quyết định dựa trên dữ liệu hiện tại/mới hơn — khỏi hỏi lại
            defer_until = dec.get("deferUntil")
            if dec.get("decision") == "defer" and defer_until:
                try:
                    if parse_iso(defer_until) > now:
                        continue  # đang trong thời gian hoãn
                except Exception:
                    pass

        ma_list = ", ".join(f"{m['ma']} (KL×{m['kl_ratio']})" for m in n.get("ma_dang_chu_y", [])[:4]) or "—"
        trang_thai = n.get("trang_thai_nguoi_duyet", "trang")
        de_xuat = n.get("de_xuat_may", trang_thai)
        context = (f"Dòng tiền nhóm {n.get('ten', nid)} đạt {score_now}/10 (mức Khỏe, ngưỡng ≥{khoe_min:g}) — "
                   f"{ma_list}. Trạng thái hiện tại {EMOJI.get(trang_thai, trang_thai)}, "
                   f"máy đề xuất {EMOJI.get(de_xuat, de_xuat)}. Mở knowledge/ kiểm tra chân chính sách "
                   f"trước khi cân nhắc sửa config/radar.json.")
        tasks.append({
            "id": f"task-{today.replace('-', '')}-{nid}",
            "type": "review_proposal",
            "signalId": signal_id,
            "context": context,
            "payload": {
                "score": score_now,
                "layer": 3,
                "confidence": "high" if score_now >= khoe_min + 1.0 else "medium",
                "summary": ma_list,
                "deltaVsYesterday": sectors_map.get(nid, {}).get("delta"),
                "scoreHistory": score_history_for(history, scale_max, nid=nid),
                "topNews": build_top_news(tin_list, nid=nid),
                "sectors": sectors_list,
            },
            "createdAt": now.isoformat(),
            "expiresAt": (now + timedelta(days=PROPOSAL_TTL_DAYS)).isoformat(),
        })

    save_json(feedback_path("pending-tasks.json"), {"schemaVersion": "1.0", "tasks": tasks})
    n_morning = sum(1 for t in tasks if t["type"] == "morning_feedback")
    n_proposal = sum(1 for t in tasks if t["type"] == "review_proposal")
    print(f"pending-tasks.json: {len(tasks)} task ({n_morning} morning_feedback, {n_proposal} review_proposal)")


if __name__ == "__main__":
    build()
