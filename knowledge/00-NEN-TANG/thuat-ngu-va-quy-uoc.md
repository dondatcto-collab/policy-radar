# THUẬT NGỮ VÀ QUY ƯỚC

## Thang trạng thái radar
| Ký hiệu | Tên | Định nghĩa | Hành động |
|---|---|---|---|
| ⚪ | Im lặng | Không có tín hiệu ở cả 2 lớp | Không làm gì |
| 🟡 | Quan sát | Có 1 trong 2 lớp (chính sách HOẶC dòng tiền) | Ghi nhận, theo dõi |
| 🟠 | Nóng | Cả 2 lớp xuất hiện nhưng chưa đủ ngưỡng điểm | Mở hồ sơ sâu |
| 🔴 | Tín hiệu | ≥70đ VÀ mỗi lớp chính ≥25/40 | Tạo file tín hiệu, con người quyết định |

## Thang mức ảnh hưởng (tin nóng cuối tuần)
- **Không đáng kể** — không liên quan nhóm theo dõi
- **Theo dõi** — có thể ảnh hưởng, cần thêm xác nhận
- **Trọng yếu** — ảnh hưởng trực tiếp nhóm 🟠/🔴, chuẩn bị cho phiên kế tiếp

## Giai đoạn văn bản chính sách (điểm tăng dần)
`Ý tưởng/phát biểu → Dự thảo → Ban hành → Có vốn/hướng dẫn thi hành → Thực thi đo được`

## Dấu vết dòng tiền lớn (định nghĩa v1 — hiệu chỉnh sau backtest)
- **KL đột biến:** khối lượng phiên ≥ 2× trung bình 20 phiên
- **Chuỗi mua ròng khối ngoại:** mua ròng ≥ 7/10 phiên gần nhất
- **Thỏa thuận bất thường:** GT thỏa thuận ≥ 3× trung bình 20 phiên
- **Dòng tiền rút:** bán ròng ≥ 10/15 phiên HOẶC thanh khoản tụt dưới nền trước tín hiệu

## Quy ước file
- Tên file: không dấu, gạch nối (vd: `ngan-hang.md`)
- Mỗi cập nhật trạng thái: 1 dòng `YYYY-MM-DD | trạng thái | lý do 1 câu`
- Nhánh 🔒 đã khóa: chỉ mở lại khi nhánh 04 có bằng chứng nó sai
