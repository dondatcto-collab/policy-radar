# PHA B — PHÂN TÍCH CHÍNH SÁCH SÂU (chỉ xây khi pha A ổn định ≥ 4 tuần)

## Mục tiêu
Nâng khả năng đọc văn bản từ "tóm tắt + gắn nhóm ngành" lên "đề xuất chuỗi tác động có căn cứ".

## Các khối dự kiến
1. **Kho văn bản có cấu trúc:** mỗi văn bản → JSON {số hiệu, ngày, giai đoạn, ngành,
   dòng tiền công dự kiến, mốc thực thi} — trích xuất bằng Gemini, người duyệt
2. **Bản đồ tri thức chính sách→ngành→mã:** khởi tạo thủ công từ 10 nhóm radar,
   máy đề xuất cạnh mới, người phê duyệt
3. **Đo độ trễ theo nhóm ngành:** từ dữ liệu backtest + nhật ký thực chiến —
   dần trả lời "loại chính sách X thường ngấm vào giá sau bao lâu"
4. **Truy vấn hồi tố:** "văn bản nào 6 tháng trước liên quan biến động hôm nay?"

## Điều kiện mở pha B
- Pha A chạy ổn ≥ 4 tuần không lỗi nghiêm trọng
- Backtest hoàn tất, khung 03 đã hiệu chỉnh
- Có ≥ 3 tín hiệu thực chiến trong nhật ký (đủ dữ liệu để biết cần sâu chỗ nào)
