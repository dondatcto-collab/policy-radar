# CLAUDE.md — Hiến pháp dự án policy-radar

Hệ thống tình báo chính sách → ngành → cổ phiếu VN. Telegram 8:00 trước ATO + dashboard.
Chạy trên GitHub Actions (miễn phí). Chủ dự án: Đạt. Ngôn ngữ làm việc: tiếng Việt.

## KIẾN TRÚC
- `pipeline/` — Python: fetch_market (vnstock EOD) → scoring (radar) → fetch_policy
  (RSS + Gemini lọc) → report (3 phần) → telegram_send. `utils.py` dùng chung.
- `config/radar.json` — 10 nhóm ngành, mã theo dõi, ngưỡng, TRẠNG THÁI DO NGƯỜI DUYỆT
- `data/` — JSON theo ngày, commit bởi bot. `*-latest.json` là bản mới nhất
- `dashboard/index.html` — tĩnh, đọc `../data/report-latest.json`, GitHub Pages
- `.github/workflows/` — evening (18:35 VN), morning (7:00 VN), weekend (chỉ tin nóng)
- `knowledge/` — cây tri thức 6 nhánh; nhánh 00 là hiến pháp nghiệp vụ, ĐỌC TRƯỚC KHI SỬA GÌ

## NGUYÊN TẮC ĐÃ KHÓA — KHÔNG SỬA nếu không có bằng chứng từ knowledge/04 (nhật ký/backtest)
1. **Máy chỉ tự động ⚪↔🟡 và ĐỀ XUẤT 🟠.** Con người duyệt 🟠/🔴 bằng cách sửa
   config/radar.json. TUYỆT ĐỐI không viết code tự đổi trạng thái 🟠/🔴 hay tự phát
   khuyến nghị mua/bán — đây là chốt chống hallucination và ranh giới pháp lý.
2. **Tín hiệu kép:** chính sách + dòng tiền. Không lớp nào một mình đủ tạo tín hiệu.
3. **Chống nhiễu:** báo cáo Telegram ≤15 dòng; không có biến động = báo cáo ngắn,
   đó là tính năng. Không thêm chỉ báo ngày/phân tích kỹ thuật ngắn hạn — hệ trung hạn 6–18 tháng.
4. **Khung chấm v1.1** (đã hiệu chỉnh bằng backtest 8 sự kiện, xem knowledge/04/backtest):
   KL so nền 22đ, khối ngoại cấp mã 8đ, phạt mua đuổi -10. Muốn đổi trọng số → phải có
   dữ liệu backtest/nhật ký kèm theo, ghi vào knowledge/04 trước.
5. **Rate limit vnstock gói Guest = 20 req/phút.** SLEEP_GIUA_MA ≥ 3.2s, retry chờ 65s.
   Không "tối ưu tốc độ" bằng cách giảm sleep trừ khi đã có key Community (60 req/phút).
6. **Hệ thống tự báo bệnh:** mọi lỗi phải nổi lên Telegram hoặc cờ ⚠️ — không nuốt exception im lặng.
7. **Dữ liệu quan trọng cần 2 nguồn đối chiếu**; lệch >5% → gắn cờ, không dùng đổi trạng thái.

## QUY ƯỚC CODE
- Python 3.11, tiếng Việt cho docstring/comment/log. Giữ pipeline KHÔNG framework,
  không database — chỉ file JSON + static site (nguyên tắc hạ tầng miễn phí, ít mối hỏng).
- Test thay đổi pipeline bằng dữ liệu giả lập trước (xem mẫu test trong lịch sử README),
  vì môi trường CI mới gọi được API thật.
- Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, GEMINI_API_KEY (GitHub Secrets). Không hardcode.
- Cron viết theo UTC; giờ VN = UTC+7. Cron GitHub có thể trễ 5–15 phút.

## VIỆC ĐANG MỞ (pha A.2)
- [x] (2026-07-07) Vá bảo mật `fetch_policy.py` (GEMINI_API_KEY chuyển sang header
      thay vì query `?key=` trong URL, tẩy key khỏi `ghi_chu`/log lỗi, tự chờ 65s
      thử lại tối đa 3 lần khi Gemini trả 429) + áp cùng nguyên tắc tẩy secret/retry
      429 cho `telegram_send.py` (token vốn nằm trong URL Telegram API — tẩy khỏi
      exception trước khi raise). Đồng thời bỏ hẳn dòng "📊 Chi tiết:" khỏi tin
      Telegram khi `DASHBOARD_URL` rỗng/"None" — logic build dòng này chuyển hẳn
      sang `telegram_send.py` (nơi duy nhất có giá trị thật lúc gửi), `report.py`
      không còn chèn placeholder `<DASHBOARD_URL>` nữa.
- [ ] `backtest_verify.py`: dùng vnstock chốt số liệu 4 sự kiện backtest sơ bộ
      (SK1 PC1 sau QHĐ8 5/2023; SK3 NVL/PDR sau NĐ08 3/2023; SK4 KDH/NLG sau 1/8/2024;
      SK8 GEG 2023–2024) — so với VN-Index cùng kỳ mốc 3–6–12 tháng, ghi kết quả vào
      knowledge/04-TIN-HIEU-VA-NHAT-KY/backtest/
- [ ] Nguồn khối ngoại theo mã ổn định (hiện scoring để trung tính 0đ — xem chú thích scoring.py)
- [ ] Khi có key vnstock Community: SLEEP_GIUA_MA = 1.1

## KHI ĐƯỢC YÊU CẦU SỬA GÌ ĐÓ
1. Đọc nhánh knowledge/00 nếu thay đổi chạm nghiệp vụ
2. Nêu rõ thay đổi có chạm nguyên tắc khóa nào không; nếu có → dừng lại hỏi chủ dự án
3. Sửa xong: cập nhật mục "VIỆC ĐANG MỞ" ở đây + chạy test giả lập + commit message tiếng Việt
