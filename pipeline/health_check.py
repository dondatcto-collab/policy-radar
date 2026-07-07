"""Hệ thống tự báo bệnh: dữ liệu thiếu/lệch → cờ ⚠️ trong báo cáo, không im lặng chết."""
from utils import load_json, data_path, today_str

def check():
    flags = []
    market = load_json(data_path("market-latest.json"))
    if not market:
        return ["⚠️ KHÔNG có dữ liệu thị trường — toàn bộ pipeline tối qua thất bại"]
    if market.get("ngay") != today_str():
        flags.append(f"⚠️ Dữ liệu thị trường của ngày {market.get('ngay')} (cũ)")
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
