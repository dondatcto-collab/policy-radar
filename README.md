# 📡 policy-radar — Pha A: Báo cáo ngày tự động

Hệ thống tình báo chính sách → ngành → cổ phiếu. Telegram 8:00 trước ATO + dashboard.
Toàn bộ chạy miễn phí: GitHub Actions + GitHub Pages + Telegram Bot + Gemini API.

## Kiến trúc
```
18:35 VN (T2–T6)  evening.yml  → vnstock kéo EOD 43 mã → chỉ báo dòng tiền → radar JSON
07:00 VN (T2–T6)  morning.yml  → quét RSS chính sách → Gemini lọc → báo cáo 3 phần
08:00 VN          → Telegram tóm tắt ≤15 dòng + link dashboard
08:30 VN (T7–CN)  weekend.yml  → chỉ nhắn khi có tin TRỌNG YẾU
Mọi lỗi → tự nhắn Telegram (hệ thống không im lặng chết)
```

## Cài đặt (1 lần, ~20 phút)
1. **Tạo repo GitHub** (private được) → push toàn bộ thư mục này
2. **Telegram bot:** chat với @BotFather → `/newbot` → lấy TOKEN.
   Chat với bot vừa tạo 1 tin bất kỳ, rồi mở
   `https://api.telegram.org/bot<TOKEN>/getUpdates` → lấy `chat.id`
3. **Gemini key:** aistudio.google.com → Get API key (miễn phí)
4. **Secrets** (repo Settings → Secrets and variables → Actions → Secrets):
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `GEMINI_API_KEY`
5. **Variable:** `DASHBOARD_URL` = `https://<user>.github.io/policy-radar/dashboard/`
6. **GitHub Pages:** Settings → Pages → Source: branch `main`, folder `/ (root)`
7. **Chạy thử:** tab Actions → chọn `evening-eod` → Run workflow → xong chạy `morning-report`
   → nhận tin Telegram đầu tiên

## Nguyên tắc đã khóa trong code
- Máy chỉ tự động ⚪↔🟡 và **đề xuất** 🟠 — con người duyệt (chống hallucination)
- Trạng thái người duyệt nằm ở `config/radar.json` → sửa tay + commit khi duyệt 🟠/🔴
- Khung chấm v1.1: KL so nền 22đ (tăng sau backtest), khối ngoại cấp mã 8đ, phạt mua đuổi -10
- Không có biến động = báo cáo ngắn. Im lặng là tính năng, không phải lỗi.

## Việc con người làm mỗi ngày (5 phút)
Đọc Telegram 8:00 → nếu có đề xuất 🟠: mở hồ sơ nhóm trong cây `knowledge/`
(HE-THONG-TINH-BAO-CHINH-SACH) kiểm tra CHÂN CHÍNH SÁCH → duyệt thì sửa
`config/radar.json` trạng thái nhóm + commit.

## Nâng cấp dự kiến (pha A.2)
- [ ] Nguồn dữ liệu khối ngoại theo mã ổn định (hiện để trung tính 0đ — ghi chú trong scoring.py)
- [ ] Hoàn tất số liệu 4 sự kiện backtest sơ bộ bằng script `backtest_verify.py`
- [ ] Đồng bộ cây knowledge vào repo
