"""Chấm trạng thái radar theo khung 03 v1.1 (đã hiệu chỉnh sau backtest).
QUAN TRỌNG: máy chỉ tự động ⚪↔🟡 và ĐỀ XUẤT 🟠/🔴 — con người duyệt trong knowledge/.
v1.2 — nếu market data cũ hơn phiên giao dịch gần nhất (cron tối chưa chạy lại được):
  KHÔNG chấm/đề xuất trạng thái mới, giữ nguyên trạng thái người đã duyệt. Tránh đề
  xuất dựa trên dòng tiền lỗi thời — vi phạm nguyên tắc tín hiệu kép (CLAUDE.md #2)."""
from utils import CONFIG, load_json, save_json, data_path, today_str
from health_check import du_lieu_cu, phien_gan_nhat

def diem_dong_tien(ind, th):
    """Lớp dòng tiền 40đ theo v1.1: KL 22 + khối ngoại cấp mã 8 + vị thế giá 10 (phạt -10 mua đuổi)."""
    d = 0
    if ind["kl_ratio"] >= th["kl_dot_bien_x"]: d += 22
    elif ind["kl_ratio"] >= th["kl_manh_x"]: d += 12
    # Khối ngoại cấp mã: cần dữ liệu chuỗi mua/bán ròng — v1 pipeline chưa có nguồn ổn định,
    # để 0 (trung tính) và ghi chú; nâng cấp khi thêm nguồn foreign flow.
    vt = ind["vi_the_vs_nen20_pct"]
    if vt <= 5: d += 10
    elif vt <= 15: d += 5
    else: d -= 10  # mua đuổi — phạt nặng theo bài học SK5
    return max(d, 0)

def trang_thai_nhom(nhom_id, nhom, market, th):
    """Trạng thái tự động từ dòng tiền; chân chính sách do con người duyệt trong knowledge."""
    diem_max, ma_manh = 0, []
    for sym in nhom["ma"]:
        ind = market["ma"].get(sym)
        if not ind or not ind["pass_thanh_khoan"]:
            continue
        d = diem_dong_tien(ind, th)
        if d >= 22:
            ma_manh.append({"ma": sym, "diem_dong_tien": d, "kl_ratio": ind["kl_ratio"]})
        diem_max = max(diem_max, d)
    # Máy chỉ đề xuất: dòng tiền mạnh → nhóm ít nhất 🟡, đề xuất 🟠 để người xem xét chân chính sách
    hien_tai = nhom.get("trang_thai", "trang")
    de_xuat = hien_tai
    if diem_max >= 22 and hien_tai in ("trang", "vang"):
        de_xuat = "cam"  # đề xuất, chưa chốt
    return {"trang_thai_nguoi_duyet": hien_tai, "de_xuat_may": de_xuat,
            "diem_dong_tien_max": diem_max, "ma_dang_chu_y": ma_manh}

def trang_thai_khoa(nhom):
    """Data cũ: giữ nguyên trạng thái người đã duyệt, không đề xuất gì — không đủ
    căn cứ vì lớp dòng tiền lỗi thời."""
    hien_tai = nhom.get("trang_thai", "trang")
    return {"trang_thai_nguoi_duyet": hien_tai, "de_xuat_may": hien_tai,
            "diem_dong_tien_max": None, "ma_dang_chu_y": []}

def main():
    th = CONFIG["thresholds"]
    market = load_json(data_path("market-latest.json"))
    if not market:
        raise SystemExit("Chưa có market-latest.json — chạy fetch_market trước")
    cu = du_lieu_cu(market)
    radar = {"ngay": today_str(), "nhom": {}, "du_lieu_cu": cu}
    for nid, nhom in CONFIG["nhom_nganh"].items():
        than = trang_thai_khoa(nhom) if cu else trang_thai_nhom(nid, nhom, market, th)
        radar["nhom"][nid] = {"ten": nhom["ten"], **than}
    radar["errors"] = market.get("errors", [])
    save_json(data_path("radar-latest.json"), radar)
    save_json(data_path(f"radar-{today_str()}.json"), radar)
    if cu:
        print(f"Radar KHÓA — market data cũ hơn phiên gần nhất ({phien_gan_nhat()})")
    else:
        print("Radar OK")

if __name__ == "__main__":
    main()
