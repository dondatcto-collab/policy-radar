"""Cron TỐI 18:30 VN — kéo dữ liệu EOD qua vnstock, tính chỉ báo dòng tiền.
v1.2 — VÁ RATE LIMIT: gói Guest của vnstock giới hạn 20 req/phút.
  • Nghỉ 3.2s giữa các mã (≈18 req/phút, dưới trần an toàn)
  • Gặp lỗi giới hạn → tự chờ 65s rồi thử lại (tối đa 3 lần/mã)
  • Tổng thời gian ~3–5 phút cho 43 mã — chấp nhận được với cron chạy đêm.
Nếu sau này đăng ký key Community (60 req/phút) tại vnstocks.com/login:
đổi SLEEP_GIUA_MA = 1.1 để chạy nhanh gấp 3."""
import sys, time
import pandas as pd
from datetime import timedelta
from utils import CONFIG, now_vn, today_str, save_json, data_path

SLEEP_GIUA_MA = 3.2      # 20 req/phút gói Guest → ~18 req/phút cho an toàn
CHO_KHI_BI_CHAN = 65     # hết cửa sổ 1 phút của rate limit
SO_LAN_THU = 3

def fetch_symbol(symbol, source="VCI"):
    from vnstock import Vnstock
    stock = Vnstock().stock(symbol=symbol, source=source)
    end = now_vn().date()
    start = end - timedelta(days=90)
    df = stock.quote.history(start=str(start), end=str(end), interval="1D")
    return df.tail(40).reset_index(drop=True)

def la_loi_rate_limit(e):
    m = str(e).lower()
    return any(k in m for k in ("giới hạn", "gioi han", "rate", "limit", "429", "too many"))

def fetch_co_retry(symbol):
    for lan in range(1, SO_LAN_THU + 1):
        try:
            return fetch_symbol(symbol)
        except Exception as e:
            if la_loi_rate_limit(e) and lan < SO_LAN_THU:
                print(f"{symbol}: chạm rate limit, chờ {CHO_KHI_BI_CHAN}s (lần {lan})...")
                time.sleep(CHO_KHI_BI_CHAN)
                continue
            raise

def compute_indicators(df, thresholds):
    n = thresholds["nen_phien"]
    if df is None or len(df) < n + 1:
        return None
    base = df.iloc[-(n+1):-1]
    last = df.iloc[-1]
    kl_nen = float(base["volume"].mean())
    gtgd_ty = float((base["volume"] * base["close"]).mean() / 1e9)
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
                df = fetch_co_retry(sym)
                ind = compute_indicators(df, th)
                if ind is None:
                    out["errors"].append(f"{sym}: thiếu dữ liệu nến")
                else:
                    ind["nhom"] = nhom_id
                    out["ma"][sym] = ind
                    print(f"✓ {sym}")
            except Exception as e:
                out["errors"].append(f"{sym}: {type(e).__name__}: {str(e)[:80]}")
            time.sleep(SLEEP_GIUA_MA)
    save_json(data_path(f"market-{today_str()}.json"), out)
    save_json(data_path("market-latest.json"), out)
    print(f"OK {len(out['ma'])} mã, {len(out['errors'])} lỗi")
    if len(out["errors"]) > len(out["ma"]):
        sys.exit(1)

if __name__ == "__main__":
    main()