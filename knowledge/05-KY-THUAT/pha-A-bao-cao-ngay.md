# PHA A — BÁO CÁO NGÀY TỰ ĐỘNG (xây tuần 5–8)

> Toàn bộ chạy trên hạ tầng miễn phí: GitHub Actions + GitHub Pages + Telegram Bot API + Gemini API

## Kiến trúc

```
┌─ 18:30 (sau EOD) ── GitHub Actions cron #1 ──────────────────┐
│  Python + vnstock: kéo giá/KL/khối ngoại phiên vừa đóng      │
│  + scrape CafeF (tự doanh, thỏa thuận — lớp tham khảo)       │
│  → tính chỉ báo radar (đột biến KL, chuỗi mua ròng, GTGD)    │
│  → DATA HEALTH CHECK: 2 nguồn lệch >5% / thiếu phiên → cờ ⚠️ │
│  → ghi data/radar-YYYY-MM-DD.json (commit vào repo)          │
└──────────────────────────────────────────────────────────────┘
┌─ 7:00 VN (cron UTC 0:00, đặt sớm bù trễ 5–15') ─ cron #2 ───┐
│  Quét RSS/trang văn bản chính sách qua đêm                   │
│  → Gemini API: tóm tắt văn bản mới, gắn nhóm ngành,          │
│    đề xuất mức ảnh hưởng (con người duyệt trạng thái 🟠🔴)   │
│  → sinh báo cáo 3 phần theo template                         │
│  → build dashboard tĩnh (Vite/React) → deploy GitHub Pages   │
└──────────────────────────────────────────────────────────────┘
┌─ 8:00 ── Telegram Bot ───────────────────────────────────────┐
│  Đẩy tóm tắt ≤ 15 dòng:                                       │
│  • Nhóm đổi trạng thái (+lý do 1 dòng)                        │
│  • Sự kiện hôm nay | • Tín hiệu đến mốc kiểm chứng            │
│  • Cờ ⚠️ dữ liệu nếu có | • Link dashboard                    │
└──────────────────────────────────────────────────────────────┘
```

## Nguyên tắc thiết kế đã khóa
1. **Máy đề xuất — người quyết trạng thái 🟠/🔴.** Gemini chỉ được tự động ⚪↔🟡.
   Lý do: chống hallucination — LLM suy diễn "chính sách X lợi cho mã Y" rất thuyết phục nhưng có thể sai.
2. **Hệ thống tự báo bệnh:** mọi lỗi scrape/API/cron đẩy thẳng về Telegram — không im lặng chết.
3. Cuối tuần/lễ: workflow riêng chỉ quét tin, có tin "trọng yếu" mới nhắn.
4. Dashboard = static site đọc JSON, không backend, không database — đúng stack quen (Vite/React/GH Pages).
5. Secrets trong GitHub: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, GEMINI_API_KEY.

## Cấu trúc repo đề xuất
```
policy-radar/
├── .github/workflows/  evening.yml | morning.yml | weekend.yml
├── pipeline/           fetch_market.py | fetch_policy.py | scoring.py |
│                       health_check.py | report.py | telegram.py
├── data/               radar-*.json (lịch sử trạng thái = dữ liệu backtest tương lai)
├── dashboard/          Vite + React, đọc data/*.json
└── knowledge/          ← chính cây thư mục này, đồng bộ vào repo
```

## Checklist xây (tuần 5–8)
- [ ] T5: fetch_market.py + scoring.py chạy local, đối chiếu tay 3 ngày
- [ ] T6: Telegram bot + cron evening/morning chạy thật, song song vận hành tay
- [ ] T7: fetch_policy.py + Gemini tóm tắt + health_check
- [ ] T8: dashboard GH Pages; chạy song song tay–máy 1 tuần, khớp nhau → tắt quy trình tay
