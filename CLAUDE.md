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
8. **Dữ liệu cũ = radar tự khóa.** So market data với PHIÊN GIAO DỊCH GẦN NHẤT
   (`health_check.phien_gan_nhat()`, lùi ngày bỏ T7/CN) chứ không so cứng với ngày
   hôm nay — sáng Thứ Hai dùng dữ liệu EOD Thứ Sáu là ĐÚNG, không phải cũ. Khi thật
   sự cũ hơn phiên gần nhất (cron tối lỗi/chưa chạy lại): `scoring.py` không chấm/đề
   xuất trạng thái mới (giữ nguyên trạng thái đã duyệt), `report.py` ẩn mục Dòng
   tiền + đề xuất (kể cả trong bảng gửi dashboard), tin Telegram chỉ còn cờ ⚠️ +
   dòng khóa. Lý do: lớp dòng tiền lỗi thời làm tín hiệu kép (#2) mất giá trị.

## QUY ƯỚC CODE
- Python 3.11, tiếng Việt cho docstring/comment/log. Giữ pipeline KHÔNG framework,
  không database — chỉ file JSON + static site (nguyên tắc hạ tầng miễn phí, ít mối hỏng).
- Test thay đổi pipeline bằng dữ liệu giả lập trước (xem mẫu test trong lịch sử README),
  vì môi trường CI mới gọi được API thật.
- Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, GEMINI_API_KEY (GitHub Secrets). Không hardcode.
- Cron viết theo UTC; giờ VN = UTC+7. Cron GitHub có thể trễ 5–15 phút.
- Model Gemini phải kiểm tra lịch deprecation tại ai.google.dev/gemini-api/docs/deprecations
  — gemini-2.5-flash hết hạn 16/10/2026, lúc đó chuyển sang gemini-3.5-flash.

## VIỆC ĐANG MỞ (pha A.2)
- [x] (2026-07-07) Vá bảo mật `fetch_policy.py` (GEMINI_API_KEY chuyển sang header
      thay vì query `?key=` trong URL, tẩy key khỏi `ghi_chu`/log lỗi, tự chờ 65s
      thử lại tối đa 3 lần khi Gemini trả 429) + áp cùng nguyên tắc tẩy secret/retry
      429 cho `telegram_send.py` (token vốn nằm trong URL Telegram API — tẩy khỏi
      exception trước khi raise). Đồng thời bỏ hẳn dòng "📊 Chi tiết:" khỏi tin
      Telegram khi `DASHBOARD_URL` rỗng/"None" — logic build dòng này chuyển hẳn
      sang `telegram_send.py` (nơi duy nhất có giá trị thật lúc gửi), `report.py`
      không còn chèn placeholder `<DASHBOARD_URL>` nữa.
- [x] (2026-07-14) Nguyên tắc mới #8 "dữ liệu cũ = radar tự khóa": thêm
      `health_check.phien_gan_nhat()`/`du_lieu_cu()`, sửa lỗi cờ "dữ liệu cũ" báo
      giả mỗi sáng Thứ Hai (Thứ Sáu không còn bị coi là cũ); `scoring.py` khóa
      chấm/đề xuất khi data thật sự cũ; `report.py` ẩn Dòng tiền + đề xuất (kể cả
      trong bảng gửi dashboard) và rút tin Telegram còn cờ ⚠️ + dòng khóa.
      `morning.yml`: cron đổi '37 23 * * 0-4' (6:37 VN, tránh giờ cao điểm 0:00 UTC).
- [x] (2026-07-14) Chẩn đoán + vá lỗi evening-eod thất bại ngày 10/07 (đọc log bằng
      `gh run list --workflow=evening.yml` + `gh run view <id> --log-failed`):
      log cho thấy `fetch_market.py` in "OK 9 mã, 34 lỗi" rồi tự `sys.exit(1)`
      (đúng thiết kế, >50% mã lỗi) — NHƯNG không có mã lỗi nào khớp
      `la_loi_rate_limit()` (không có dòng "chạm rate limit" nào trong log) nên
      không lần nào được retry, và vì bước "Commit data" không chạy khi bước
      trước fail, `market-2026-07-10.json` (đã ghi ra file, có chi tiết 34 lỗi)
      KHÔNG được commit → mất luôn chi tiết lỗi thật, không thể xác định nguyên
      nhân gốc chính xác của riêng ngày đó. Đã vá 3 chỗ: (1) `fetch_market.py` in
      chi tiết từng lỗi ra log ngay lúc xảy ra thay vì chỉ gom âm thầm vào JSON;
      (2) mở rộng `la_loi_rate_limit()`→`la_loi_tam_thoi()` nhận thêm
      timeout/kết nối/50x để được thử lại thay vì fail ngay; (3) `evening.yml`:
      bước "Commit data" thêm `if: always()` để dữ liệu + lỗi chi tiết luôn được
      lưu lại dù bước fetch/scoring fail — tránh lặp lại tình trạng "mất bằng
      chứng" như lần 10/07.
- [x] (2026-07-14) Đổi model Gemini `gemini-2.0-flash` (Google tắt 01/06/2026) →
      `gemini-2.5-flash` (free tier 10 RPM, 250 RPD, hết hạn 16/10/2026) trong
      `fetch_policy.py`. Đã ghi hạn dùng + bước chuyển tiếp vào QUY ƯỚC CODE.
- [x] (2026-07-14) Vá lỗi `gemini_filter()` crash khi Gemini gọi thành công nhưng
      trả text rỗng ("Expecting value: line 1 column 1" khi parse JSON): kiểm tra
      candidates/parts/text tồn tại trước khi parse (rỗng → trả `ghi_chu` kèm
      `finishReason` thay vì crash); luôn in text thô ra log TRƯỚC khi parse để
      debug được lần sau; cắt bỏ text thừa trước dấu `{`/`[` đầu tiên nếu Gemini
      trả lời kèm lời dẫn ngoài JSON.
- [x] (2026-07-17) App đánh giá v1.0 theo `SPEC-app-danh-gia-v1.md`: Vite+React
      trong `app/`, không backend/database,
      ghi dữ liệu qua GitHub Contents API (fine-grained PAT lưu localStorage, nhập ở
      màn Cài đặt). Đã làm UI cho `morning_feedback` + `review_proposal` (schema đủ 4
      loại, `journal/` và `evals/` để v1.1/v1.2 sau). Tín hiệu sống (4 mức + hysteresis
      0.3 điểm + xu hướng hồi quy tuyến tính + sparkline + decay độ tươi) tính từ lịch
      sử `data/radar-*.json` — điểm `diem_dong_tien_max` (thang thiết kế 0–40 theo khung
      v1.1) quy đổi /4 về thang 0–10 để hiển thị, hệ số nằm ở `app/src/lib/constants.js`
      (đổi nếu khung chấm 03 v1.1 đổi thang — vẫn cần backtest trước theo nguyên tắc #4).
      Seed rỗng `feedback/feedback.json`, `feedback/decisions.json`,
      `feedback/pending-tasks.json` (schemaVersion 1.0) — nguồn sinh
      `pending-tasks.json` làm ở việc riêng bên dưới (2026-07-17, gen_pending_tasks.py).
      Deploy: workflow MỚI
      `.github/workflows/app-build.yml` (không đụng evening/morning/weekend.yml) tự
      `npm run build` và commit `app/dist/` khi `app/src/**` đổi trên `main`; Pages vẫn
      giữ nguyên cấu hình cũ (source `main` `/(root)`), phục vụ tại
      `.../policy-radar/app/dist/`. Đã kiểm thử toàn bộ luồng (hysteresis đa bậc, lọc
      ngày khóa null, streak, merge DEFAULT_STATE, hàng đợi offline + đồng bộ lại, 3 màn
      hình) bằng harness giả lập tạm thời rồi xóa trước khi bàn giao — KHÔNG sửa file
      nào trong `pipeline/`, `config/`, hay `data/`.
- [x] (2026-07-17) `pipeline/gen_pending_tasks.py` (script MỚI) sinh
      `feedback/pending-tasks.json` — gọi bằng ĐÚNG 1 step mới thêm vào cuối
      `morning.yml` (không sửa 5 step cũ), tự commit+push file sau khi chạy, tự gửi
      cảnh báo Telegram riêng nếu lỗi (vì step "Báo lỗi nếu fail" nằm trước, không
      bắt được lỗi của step mới thêm sau nó). Mỗi sáng: 1 task `morning_feedback`
      gắn `reportId = rpt-{ngày}` (id gắn ngày nên rerun cùng ngày không tạo trùng,
      `context` tóm số tin/dòng tiền/cảnh báo trong report-latest.json). Task
      `review_proposal` sinh cho nhóm ĐỦ CẢ HAI điều kiện: (a) `diem_dong_tien_max`
      quy đổi /SCORE_RAW_MAX*10 vượt ngưỡng mức "khoe" — đọc THẲNG từ
      `app/src/lib/constants.js` bằng regex (không hard-code lại số, đổi ngưỡng chỉ
      cần sửa 1 chỗ), (b) `de_xuat_may != trang_thai_nguoi_duyet` trong
      radar-latest.json (nhóm điểm cao nhưng máy/người đã khớp trạng thái rồi thì
      KHÔNG tạo task — tránh nhắc lại việc đã xong, nguyên tắc #3 chống nhiễu).
      Chống spam: bỏ qua nếu đã có task `review_proposal` chưa hết hạn cho đúng
      signalId, hoặc `decisions.json` đã có approve/reject với dữ liệu hiện tại/mới
      hơn, hoặc đang trong thời gian "Hoãn" (`deferUntil` tương lai). Task hết hạn
      (`expiresAt` — 20h cho morning_feedback, 7 ngày cho review_proposal, khớp trần
      "Hoãn" dài nhất trong app) bị lọc khỏi file mỗi lần chạy. Không có Python cài
      cục bộ để chạy thử thật — đã kiểm chứng toàn bộ nhánh logic (bao gồm 5 kịch
      bản decisions.json) bằng cách port sang Node chạy trên dữ liệu THẬT của repo
      (`data/radar-latest.json` ngày 2026-07-16: đúng ra `bds` tạo task, `chung-khoan`
      bị loại vì đã duyệt khớp `cam`/`cam`); CHƯA chạy qua Actions thật — theo dõi
      lần cron sáng kế tiếp để xác nhận.
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
