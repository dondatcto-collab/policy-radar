# KHUNG CHẤM ĐIỂM MÃ CỔ PHIẾU (v1.1 — đã hiệu chỉnh sau backtest 03/07/2026)

> Thay đổi so v1: khối ngoại 15→8đ, KL so nền 15→22đ, phạt mua đuổi -5→-10.
> Căn cứ: 2025 tiền NỘI dẫn sóng (+40,87%) dù ngoại bán ròng kỷ lục; tín hiệu SK5 phát sát đỉnh.

## Bước 0 — Cổng lọc cứng (rớt là loại, không chấm tiếp)
- [ ] GTGD trung bình 20 phiên ≥ 50 tỷ/ngày
- [ ] Không thuộc diện cảnh báo/kiểm soát/hủy niêm yết
- [ ] Không có dấu hiệu bất thường quản trị đang bị điều tra công khai

## Thang 100 điểm

### Lớp CHÍNH SÁCH — 40đ
| Tiêu chí | Điểm tối đa |
|---|---|
| Mức liên quan: hưởng lợi trực tiếp (15) / gián tiếp qua 1 lớp (8) / xa (3) | 15 |
| Giai đoạn văn bản: có vốn-thực thi (15) / ban hành (10) / dự thảo (5) / phát biểu (2) | 15 |
| Độ rõ chuỗi tác động đến doanh thu: định lượng được (10) / định tính rõ (6) / mơ hồ (2) | 10 |

### Lớp DÒNG TIỀN — 40đ
| Tiêu chí | Điểm tối đa |
|---|---|
| KL so nền 20 phiên: ≥2× nhiều phiên (22) / 1.5–2× (12) / bình thường (0) | 22 |
| Khối ngoại cấp MÃ: mua ròng ≥7/10 phiên (8) / trung tính (0) / bán ròng kéo dài hoặc room hở nhanh (-10) | 8 |
| Vị thế giá: tích lũy gần nền (10) / mới thoát nền <15% (5) / đã chạy xa — mua đuổi (-10) | 10 |

### Lớp ĐỊNH GIÁ — 20đ (bộ điều chỉnh, không phải quyết định)
| Tiêu chí | Điểm tối đa |
|---|---|
| P/E, P/B so trung bình 3 năm chính nó: rẻ hơn (10) / ngang (5) / đắt hơn (0) | 10 |
| So trung bình ngành hiện tại: rẻ hơn (10) / ngang (5) / đắt hơn (0) | 10 |

## Ngưỡng trạng thái
- **≥ 50đ** → 🟠 Nóng — mở hồ sơ sâu
- **≥ 70đ VÀ chính sách ≥ 25/40 VÀ dòng tiền ≥ 25/40** → 🔴 Tín hiệu
  (điều kiện kép: định giá rẻ không được "gánh" cho tín hiệu thiếu chất)

## Đầu ra bắt buộc khi 🔴
Tạo file trong `04/tin-hieu/` theo `04/template-tin-hieu.md` — đủ 6 mục, có luận điểm ngược.
