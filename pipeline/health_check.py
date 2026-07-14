"""Hệ thống tự báo bệnh: dữ liệu thiếu/lệch → cờ ⚠️ trong báo cáo, không im lặng chết.
v1.1 — sửa lỗi báo "dữ liệu cũ" giả mỗi sáng Thứ Hai: so market data với PHIÊN GIAO
  DỊCH GẦN NHẤT (lùi ngày, bỏ T7/CN) thay vì so cứng với ngày hôm nay — sáng Thứ Hai
  dữ liệu EOD của Thứ Sáu là dữ liệu ĐÚNG, không phải dữ liệu cũ."""
from datetime import timedelta
from utils import load_json, data_path, today_str, now_vn

def phien_gan_nhat(tu_ngay=None):
    """Ngày (YYYY-MM-DD) của phiên giao dịch gần nhất TRƯỚC tu_ngay (mặc định hôm
    nay giờ VN) — lùi ngày, bỏ qua Thứ Bảy/Chủ Nhật. VD: hôm nay Thứ Hai → Thứ Sáu."""
    d = (tu_ngay or now_vn().date()) - timedelta(days=1)
    while d.weekday() >= 5:  # 5=Thứ Bảy, 6=Chủ Nhật
        d -= timedelta(days=1)
    return d.strftime("%Y-%m-%d")

def du_lieu_cu(market):
    """True nếu market data CŨ HƠN phiên giao dịch gần nhất — tức thật sự cũ
    (cron tối chưa chạy lại được), không phải chỉ vì hôm nay khác ngày do nghỉ cuối tuần."""
    if not market or not market.get("ngay"):
        return True
    return market["ngay"] < phien_gan_nhat()

def check():
    flags = []
    market = load_json(data_path("market-latest.json"))
    if not market:
        return ["⚠️ KHÔNG có dữ liệu thị trường — toàn bộ pipeline tối qua thất bại"]
    if du_lieu_cu(market):
        flags.append(f"⚠️ Dữ liệu thị trường của ngày {market.get('ngay')} cũ hơn phiên "
                      f"gần nhất ({phien_gan_nhat()}) — radar tạm khóa, chờ cron tối chạy lại")
    errs = market.get("errors", [])
    if errs:
        flags.append(f"⚠️ {len(errs)} mã lỗi dữ liệu: " + "; ".join(errs[:3]) + ("..." if len(errs) > 3 else ""))
    n_ok = len(market.get("ma", {}))
    if n_ok < 30:
        flags.append(f"⚠️ Chỉ lấy được {n_ok}/43 mã — KHÔNG ra quyết định dựa trên radar hôm nay")
    policy = load_json(data_path("policy-latest.json"))
    if policy and policy.get("ghi_chu"):
        flags.append(f"⚠️ Lọc tin: {policy['ghi_chu']}")
    return flags

if __name__ == "__main__":
    for f in check():
        print(f)
