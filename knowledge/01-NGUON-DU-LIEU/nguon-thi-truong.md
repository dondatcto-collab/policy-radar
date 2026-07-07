# NGUỒN THỊ TRƯỜNG & DÒNG TIỀN

## Trục chính: vnstock (Python, miễn phí)
```python
# pip install vnstock
# Đủ cho: giá/KL lịch sử, khối ngoại theo mã, BCTC, thông tin DN, chỉ số ngành
```
Dùng để tính các dấu vết cá mập cốt lõi:
- KL phiên / trung bình 20 phiên (ngưỡng đột biến ≥ 2×)
- Chuỗi mua/bán ròng khối ngoại (≥ 7/10 phiên)
- GTGD trung bình 20 phiên (cổng lọc thanh khoản ≥ 50 tỷ)
- P/E, P/B hiện tại so với lịch sử

## Nguồn bổ sung (đọc + scrape nhẹ)
| Nguồn | Dùng cho | Lưu ý |
|---|---|---|
| CafeF | Tự doanh, thỏa thuận, thống kê ngành | Dữ liệu tự doanh miễn phí trễ/thiếu → chỉ là lớp THAM KHẢO, không phải điều kiện bắt buộc |
| Vietstock | Đối chiếu số liệu, lịch sự kiện DN | |
| Fireant (free) | Dự phòng khi 2 nguồn trên lệch nhau | |
| HOSE/HNX | Công bố thông tin DN chính thức | |

## Nguyên tắc chất lượng dữ liệu
1. Mỗi số liệu quan trọng: **2 nguồn đối chiếu**
2. Hai nguồn lệch > 5% → gắn cờ ⚠️ trong báo cáo, không dùng để đổi trạng thái
3. Nguồn scrape phải có cơ chế **tự báo lỗi** khi trang đổi cấu trúc (yêu cầu pha A)
4. Khung trung hạn → dữ liệu EOD/trễ 15 phút là ĐỦ, không trả tiền cho realtime
