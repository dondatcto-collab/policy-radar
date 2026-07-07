# HỆ THỐNG TÌNH BÁO CHÍNH SÁCH → NGÀNH → CỔ PHIẾU

> Phiên bản: v3.1 (đã tối ưu sau rà soát toàn diện) — Khởi tạo: 07/2026
> Vai trò: **TÌNH BÁO, không phải máy khuyến nghị.** Quyết định cuối cùng là của con người.

## Sơ đồ hệ thống

```
├── 00-NEN-TANG/            🔒 Triết lý, nguyên tắc, quy trình vận hành
├── 01-NGUON-DU-LIEU/       🔒 Nguồn chính sách, thị trường, dòng tiền
├── 02-BAN-DO-CHINH-SACH-NGANH/  Radar 2 tầng (10 nhóm tay → 25 nhóm tự động)
├── 03-PHAN-TICH-CO-PHIEU/  Khung chấm điểm 4 lớp
├── 04-TIN-HIEU-VA-NHAT-KY/ ❤️ Trái tim: tín hiệu, luận điểm ngược, backtest
└── 05-KY-THUAT/            Pha A (báo cáo ngày) → Pha B (phân tích sâu)
```

## Chín quyết định nền tảng (đã khóa)

1. **Khung thời gian:** trung hạn 6–18 tháng theo chu kỳ chính sách
2. **Khẩu vị:** mã đầu ngành, thanh khoản cao, đi theo dấu vết dòng tiền lớn
3. **Nhịp:** báo cáo ngày 8:00 trước ATO; cuối tuần chỉ khi có tin nóng
4. **Kiểm chứng:** backtest 8 sự kiện 2020–2025 trước khi chạy thật
5. **Phạm vi:** không khóa ngành — radar quét toàn thị trường, đi theo tín hiệu
6. **Dữ liệu:** bộ miễn phí (vnstock trục chính), 2 nguồn đối chiếu
7. **Kênh:** Telegram đẩy tóm tắt 8:00 + link dashboard chi tiết
8. **Chấm điểm:** thanh khoản (lọc cứng) + chính sách 40 + dòng tiền 40 + định giá 20
9. **Đóng tín hiệu:** theo trạng thái — chân chính sách gãy HOẶC dòng tiền rút

## Nguyên tắc vàng

- **Tín hiệu kép bắt buộc:** chính sách + dòng tiền. Thiếu một chân → chỉ là "quan sát".
- **Chống nhiễu:** 1–3 tín hiệu/tháng. Báo cáo ngày chỉ được đổi trạng thái radar.
- **Luận điểm ngược bắt buộc** trong mọi tín hiệu — hệ thống phải tự phản biện.
- **Nhánh 04 là trái tim:** giá trị hệ thống nằm ở nơi nó đối diện những lần nó sai.

## Lộ trình thực thi

| Giai đoạn | Việc | Trạng thái |
|---|---|---|
| Tuần 1–2 | Khung thư mục + nền tảng + điền 10 nhóm radar | 🟢 Đang chạy |
| Tuần 3–4 | Backtest 8 sự kiện, hiệu chỉnh trọng số | ⚪ |
| Tuần 5–8 | Pha A kỹ thuật (pipeline → Telegram + dashboard) | ⚪ |
| Tuần 9+ | Chạy sống, tích lũy nhật ký đánh giá | ⚪ |

## ⚠️ Ranh giới pháp lý

Hệ thống này phục vụ **cá nhân**. Nếu tương lai công khai (web/Telegram public):
phải gỡ toàn bộ điểm số và trạng thái gắn với mã cụ thể — hoạt động tư vấn đầu tư
chứng khoán tại VN yêu cầu giấy phép. Chỉ được public phần tóm tắt chính sách và
phân tích ngành ở mức thông tin.
