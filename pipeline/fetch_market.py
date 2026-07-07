"""Cron TỐI 18:30 VN — kéo dữ liệu EOD qua vnstock, tính chỉ báo dòng tiền.
Nguyên tắc 00: nến ngày là đủ, không realtime. Mọi lỗi ghi vào errors để health_check gắn cờ."""
import sys, time
import pandas as pd
from datetime import timedelta
from utils import CONFIG, now_vn, today_str, save_json, data_path

def fetch_symbol(symbol, source="VCI"):
    """Trả về DataFrame nến ngày ~40 phiên gần nhất + dữ liệu khối ngoại nếu có."""
    from vnstock import Vnstock
    stock = Vnstock().stock(symbol=symbol, source=source)
    end = now_vn().date()
    start = end - timedelta(days=90)
    df = stock.quote.history(start=str(start), end=str(end), interval="1D")
    df = df.tail(40).reset_index(drop=True)
    return df

def compute_indicators(df, thresholds):
    """Chỉ báo theo thuật ngữ 00: KL so nền 20 phiên, GTGD TB, vị thế giá so nền."""
    n = thresholds["nen_phien"]
    if df is None or len(df) < n + 1:
        return None
    base = df.iloc[-(n+1):-1]
    last = df.iloc[-1]
    kl_nen = float(base["volume"].mean())
    gtgd_ty = float((base["volume"] * base["close"]).mean() / 1e9)  # tỷ VND (giá nghìn đồng → *1000/1e9... vnstock trả giá nghìn đồng)
    gtgd_ty = gtgd_ty * 1000 if last["close"] < 1000 else gtgd_ty
    kl_ratio = float(last["volume"] / kl_nen) if kl_nen else 0.0
    nen_gia = float(base["close"].mean())
    vi_the_pct = float((last["close"] - nen_gia) / nen_gia * 100) if nen_gia else 0.0
    return {
        "close": float(last["close"]),
        "change_pct": float((last["close"] / df.iloc[-2]["close"] - 1) * 100),
        "kl_ratio": round(kl_ratio, 2),
        "gtgd_tb20_ty": round(gtgd_ty, 1),
        "vi_the_vs_nen20_pct": round(vi_the_pct, 1),
        "pass_thanh_khoan": gtgd_ty >= thresholds["gtgd_min_ty"],
    }

def main():
    th = CONFIG["thresholds"]
    out = {"ngay": today_str(), "cap_nhat": now_vn().isoformat(), "ma": {}, "errors": []}
    for nhom_id, nhom in CONFIG["nhom_nganh"].items():
        for sym in nhom["ma"]:
            try:
                df = fetch_symbol(sym)
                ind = compute_indicators(df, th)
                if ind is None:
                    out["errors"].append(f"{sym}: thiếu dữ liệu nến")
                else:
                    ind["nhom"] = nhom_id
                    out["ma"][sym] = ind
                time.sleep(0.6)  # lịch sự với API miễn phí
            except Exception as e:
                out["errors"].append(f"{sym}: {type(e).__name__}: {e}")
    save_json(data_path(f"market-{today_str()}.json"), out)
    save_json(data_path("market-latest.json"), out)
    print(f"OK {len(out['ma'])} mã, {len(out['errors'])} lỗi")
    if len(out["errors"]) > len(out["ma"]):
        sys.exit(1)  # lỗi nhiều hơn thành công → fail workflow để được báo

if __name__ == "__main__":
    main()
