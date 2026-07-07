"""Sinh báo cáo sáng 3 phần (đúng template 00) → JSON cho dashboard + text cho Telegram."""
from utils import CONFIG, load_json, save_json, data_path, today_str, now_vn
from health_check import check

EMOJI = CONFIG["trang_thai_map"]

def build():
    market = load_json(data_path("market-latest.json"), {})
    radar = load_json(data_path("radar-latest.json"), {"nhom": {}})
    policy = load_json(data_path("policy-latest.json"), {"tin_lien_quan": []})
    flags = check()

    # Phần 1 — nhịp hôm qua: nhóm có dòng tiền nổi bật
    noi_bat = []
    for nid, n in radar.get("nhom", {}).items():
        for m in n.get("ma_dang_chu_y", []):
            noi_bat.append(f"{m['ma']} ({n['ten']}): KL ×{m['kl_ratio']}")
    # Phần 2 — hôm nay: tin chính sách liên quan
    tin = policy.get("tin_lien_quan", [])
    # Phần 3 — trạng thái: nhóm máy đề xuất nâng
    de_xuat = [f"{n['ten']}: {EMOJI[n['trang_thai_nguoi_duyet']]}→{EMOJI[n['de_xuat_may']]}"
               for n in radar.get("nhom", {}).values()
               if n.get("de_xuat_may") != n.get("trang_thai_nguoi_duyet")]

    rp = {"ngay": today_str(), "cap_nhat": now_vn().isoformat(),
          "flags": flags, "dong_tien_noi_bat": noi_bat[:8],
          "tin_chinh_sach": tin[:6], "de_xuat_trang_thai": de_xuat,
          "radar": radar.get("nhom", {})}
    save_json(data_path("report-latest.json"), rp)

    # Text Telegram ≤ 15 dòng
    lines = [f"📡 RADAR {today_str()} — trước ATO"]
    lines += flags[:2]
    if noi_bat:
        lines.append("💰 Dòng tiền: " + " | ".join(noi_bat[:3]))
    if de_xuat:
        lines.append("🔺 Máy đề xuất: " + " | ".join(de_xuat[:3]) + " (cần người duyệt)")
    for t in tin[:3]:
        icon = "🔥" if t.get("muc_do") == "trong-yeu" else "👁"
        lines.append(f"{icon} {t.get('tieu_de','')[:80]}")
    if len(lines) == 1:
        lines.append("Không có biến động đáng chú ý. Ngày yên tĩnh — đúng tinh thần chống nhiễu.")
    lines.append("📊 Chi tiết: <DASHBOARD_URL>")
    text = "\n".join(lines[:15])
    with open(data_path("report-latest.txt"), "w", encoding="utf-8") as f:
        f.write(text)
    print(text)
    return text

if __name__ == "__main__":
    build()
