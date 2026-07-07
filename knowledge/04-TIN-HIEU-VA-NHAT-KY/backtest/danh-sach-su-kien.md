# BACKTEST — DANH SÁCH 8 SỰ KIỆN (ĐÃ CHỐT)

> ⚠️ NGUYÊN TẮC: Danh sách này chốt TRƯỚC khi xem bất kỳ đồ thị giá nào.
> Gồm cả sự kiện kỳ vọng thành công VÀ thất bại — chống thiên kiến nhìn lại.
> Chi tiết văn bản (số hiệu, ngày) cần xác minh lại từ nguồn gốc khi thực hiện.

## Nhóm kỳ vọng THÀNH CÔNG (chính sách → ngành chạy)
| # | Sự kiện | Thời điểm | Nhóm ngành kiểm chứng |
|---|---|---|---|
| 1 | Quy hoạch điện VIII được phê duyệt | ~05/2023 | Điện, xây lắp điện |
| 2 | Đẩy mạnh đầu tư công: khởi công đồng loạt cao tốc Bắc-Nam GĐ2, sân bay Long Thành | ~01/2023 | Hạ tầng, đá, VLXD |
| 3 | Nghị định 08/2023 tháo gỡ trái phiếu doanh nghiệp | ~03/2023 | BĐS, ngân hàng |
| 4 | Bộ luật BĐS mới (Đất đai, Nhà ở, KDBĐS) hiệu lực sớm | ~08/2024 | BĐS, BĐS KCN |
| 5 | Tiến trình nâng hạng: Thông tư 68/2024 (non-prefunding) → FTSE nâng hạng | 11/2024 → 2025 | Chứng khoán, bluechip |
| 6 | Nghị quyết 57 về đột phá KHCN-ĐMST-chuyển đổi số | ~12/2024 | Công nghệ, viễn thông |

## Nhóm THẤT BẠI có chủ đích (chính sách có nhưng ngành không chạy bền)
| # | Sự kiện | Thời điểm | Bài học cần rút |
|---|---|---|---|
| 7 | Gói hỗ trợ lãi suất 2% (NQ 43/2022) — giải ngân rất thấp | 2022–2023 | Văn bản ban hành ≠ tiền chảy; phải chấm theo "có vốn thực" |
| 8 | Điện gió/điện khí trong QHĐ VIII — thiếu cơ chế giá kéo dài | 2023–2024 | Chuỗi tác động đứt ở khâu cơ chế; điểm "độ rõ chuỗi" phải khắt khe |

## Quy trình chạy backtest cho MỖI sự kiện
1. **Đóng vai quá khứ:** chỉ đọc văn bản + dữ liệu TÍNH ĐẾN ngày ban hành, chấm điểm theo khung 03
2. Ghi tín hiệu giả lập (mã nào 🟠/🔴, điểm bao nhiêu) — TRƯỚC khi mở chart
3. Mở dữ liệu giá thực tế 3–6–12 tháng sau (vnstock), so với VN-Index cùng kỳ
4. Điền hồ sơ: `backtest/su-kien-XX.md` — đúng/sai, độ trễ thực tế, khung chấm sai ở đâu
5. Sau đủ 8 sự kiện → phiên hiệu chỉnh: cập nhật trọng số khung 03 + ngưỡng thuật ngữ 00

## Chỉ tiêu đạt để cho hệ thống chạy sống
- ≥ 5/8 sự kiện: hệ thống chấm đúng hướng (thành công ra 🔴, thất bại KHÔNG ra 🔴)
- Đo được độ trễ trung bình chính sách → giá cho ít nhất 3 nhóm ngành
