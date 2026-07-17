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
"""
import os
import re
from datetime import datetime, timedelta

from utils import CONFIG, ROOT, load_json, save_json, data_path, today_str, now_vn

FEEDBACK_DIR = os.path.join(ROOT, "feedback")
CONSTANTS_JS = os.path.join(ROOT, "app", "src", "lib", "constants.js")
EMOJI = CONFIG["trang_thai_map"]

MORNING_TTL_HOURS = 20   # hết hạn trước khi cron sáng hôm sau tạo bản mới
PROPOSAL_TTL_DAYS = 7    # khớp trần lựa chọn "Hoãn" dài nhất trong app (1 tuần)


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


def build():
    now = now_vn()
    today = today_str()
    scale_max, khoe_min = doc_nguong_khoe()

    report = load_json(data_path("report-latest.json"), {})
    radar = load_json(data_path("radar-latest.json"), {"nhom": {}, "ngay": today})
    pending = load_json(feedback_path("pending-tasks.json"), {"schemaVersion": "1.0", "tasks": []})
    decisions = load_json(feedback_path("decisions.json"), {"schemaVersion": "1.0", "entries": []})

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
            "payload": {"score": None, "layer": None, "confidence": None, "summary": ctx},
            "createdAt": now.isoformat(),
            "expiresAt": (now + timedelta(hours=MORNING_TTL_HOURS)).isoformat(),
        })

    # 3) review_proposal — nhóm có dòng tiền vượt ngưỡng "khoe" (quy đổi 0-10 theo constants.js)
    for nid, n in radar.get("nhom", {}).items():
        diem = n.get("diem_dong_tien_max")
        if diem is None:
            continue  # radar khóa (data cũ) hoặc chưa mã nào qua lọc thanh khoản — không đủ căn cứ
        score10 = round(diem / scale_max * 10, 1)
        if score10 < khoe_min:
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
        context = (f"Dòng tiền nhóm {n.get('ten', nid)} đạt {score10}/10 (mức Khỏe, ngưỡng ≥{khoe_min:g}) — "
                   f"{ma_list}. Trạng thái hiện tại {EMOJI.get(trang_thai, trang_thai)}, "
                   f"máy đề xuất {EMOJI.get(de_xuat, de_xuat)}. Mở knowledge/ kiểm tra chân chính sách "
                   f"trước khi cân nhắc sửa config/radar.json.")
        tasks.append({
            "id": f"task-{today.replace('-', '')}-{nid}",
            "type": "review_proposal",
            "signalId": signal_id,
            "context": context,
            "payload": {
                "score": score10,
                "layer": 3,
                "confidence": "high" if score10 >= khoe_min + 1.0 else "medium",
                "summary": ma_list,
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
