# SPEC — App đánh giá Policy Radar v1.0

> Tài liệu bàn giao cho Claude Code (Sonnet). Mọi quyết định thiết kế trong file này ĐÃ CHỐT — không đề xuất thay đổi kiến trúc, chỉ hỏi lại khi spec thiếu chi tiết kỹ thuật.

## 1. Mục tiêu

App web (mobile-first) để người dùng đánh giá output của hệ thống policy-radar với ma sát thấp nhất, tạo "dữ liệu vàng" (nhãn) lưu về repo GitHub phục vụ chấm công quý và hiệu chỉnh trọng số scoring.

## 2. Phạm vi v1 — "Schema đủ 4, UI làm 2"

LÀM trong v1:
- UI + luồng ghi cho 2 loại nhiệm vụ: `morning_feedback` (phản hồi tin sáng) và `review_proposal` (duyệt đề xuất)
- Dải tín hiệu sống (4 mức + hysteresis + xu hướng + sparkline + decay)
- Streak ngày đánh giá của người dùng
- Màn hình Cài đặt (nhập/đổi token)

KHÔNG làm trong v1 (đã có schema, UI làm sau):
- Nhật ký tuần (`journal/`) — v1.1
- Chấm công quý (`evals/`) — v1.2

## 3. Tech stack (đã chốt, không đổi)

- Vite + React, không backend, không database
- Deploy: GitHub Pages, chung repo policy-radar, thư mục `app/`
- Ghi dữ liệu: GitHub REST API (Contents API) + fine-grained Personal Access Token
  - Token scope: chỉ repo policy-radar, quyền Contents read/write, hạn 90 ngày
  - Token lưu localStorage, nhập ở màn Cài đặt
- Đọc dữ liệu: raw.githubusercontent.com (public) hoặc Contents API (nếu repo private thì dùng API với token)

## 4. Cấu trúc repo

```
policy-radar/
├── data/                      # điểm số batch hiện có — CHỈ ĐỌC, không sửa
├── feedback/
│   ├── pending-tasks.json     # máy sinh (Actions) — app CHỈ ĐỌC
│   ├── feedback.json          # app ghi (append entry)
│   ├── decisions.json         # app ghi (append entry)
│   ├── journal/               # v1.1 — chưa đụng
│   └── evals/                 # v1.2 — chưa đụng
└── app/                       # source app này
```

QUAN TRỌNG: app chỉ được ghi vào `feedback/feedback.json` và `feedback/decisions.json`. Tuyệt đối không sửa file trong `data/` và không sửa code pipeline hiện có của policy-radar.

## 5. Schema JSON (v1.0 — đã chốt)

Mọi file có trường `schemaVersion`. Khi đọc, merge với DEFAULT_STATE để chịu được schema cũ/thiếu trường (xem mục 9).

### 5.1 `pending-tasks.json` (máy sinh — app đọc)
```json
{
  "schemaVersion": "1.0",
  "tasks": [{
    "id": "task-20260717-001",
    "type": "morning_feedback | review_proposal",
    "signalId": "sig-xxx",
    "context": "Chú thích: cần đánh giá điều gì, vì sao",
    "payload": { "score": 7.2, "layer": 3, "confidence": "low|medium|high", "summary": "..." },
    "createdAt": "ISO-8601",
    "expiresAt": "ISO-8601"
  }]
}
```

### 5.2 `feedback.json` (app ghi)
```json
{
  "schemaVersion": "1.0",
  "entries": [{
    "id": "fb-2026-07-17",
    "date": "2026-07-17",
    "reportId": "rpt-2026-07-17",
    "rating": "on_target | noise",
    "note": "",
    "createdAt": "ISO-8601"
  }]
}
```

### 5.3 `decisions.json` (app ghi)
```json
{
  "schemaVersion": "1.0",
  "entries": [{
    "id": "dec-20260717-001",
    "taskId": "task-20260717-001",
    "signalId": "sig-xxx",
    "proposalSnapshot": { "score": 7.2, "layer": 3, "summary": "..." },
    "decision": "approve | reject | defer",
    "reason": "1 dòng — BẮT BUỘC, không cho submit khi rỗng",
    "deferUntil": "ISO-8601 | null",
    "decidedAt": "ISO-8601"
  }]
}
```
`proposalSnapshot` = bản chụp nguyên payload đề xuất tại thời điểm quyết định (copy từ task, không tham chiếu).

### 5.4 `journal/YYYY-Www.json` (v1.1 — chỉ định nghĩa type, chưa làm UI)
```json
{
  "schemaVersion": "1.0",
  "week": "2026-W29",
  "autoData": { "weeklyAvgScore": 6.8, "topSignals": [], "deltaVsLastWeek": 0.4 },
  "answers": [{ "q": "...", "a": "" }],
  "createdAt": "ISO-8601"
}
```

### 5.5 `evals/YYYY-Qn.json` (v1.2 — chỉ định nghĩa type, chưa làm UI)
```json
{
  "schemaVersion": "1.0",
  "quarter": "2026-Q3",
  "metrics": { "layer1": { "precision": 0, "recall": 0 } },
  "adjustments": [{ "param": "w_layer3", "old": 0.25, "new": 0.30, "rationale": "" }],
  "frameworkFrom": "1.1",
  "frameworkTo": "1.2",
  "confirmedAt": "ISO-8601"
}
```

## 6. Logic tín hiệu sống (tính trên client, nguồn: lịch sử điểm trong `data/`)

### 6.1 Trạng thái 4 mức + hysteresis
Ngưỡng cơ sở theo điểm 0–10 (có thể chỉnh trong 1 file constants duy nhất):
- Khỏe (teal): ≥ 7.0
- Ổn (blue): 5.5 – 6.99
- Suy yếu (amber): 4.0 – 5.49
- Xấu (red): < 4.0

Hysteresis: đệm 0.3 điểm hai chiều. Muốn LÊN hạng phải vượt ngưỡng-trên + 0.3; muốn XUỐNG hạng phải thủng ngưỡng-dưới − 0.3. Trạng thái hiện tại lưu localStorage để so sánh phiên sau. Mục đích: chống nhấp nháy đổi màu khi điểm dao động quanh ngưỡng.

### 6.2 Xu hướng
Hồi quy tuyến tính đơn giản (least squares slope) trên 7 điểm gần nhất (nếu thiếu thì tối thiểu 5):
- slope > +0.05/phiên → mũi tên ↑ (arrow-up-right)
- slope < −0.05/phiên → mũi tên ↓ (arrow-down-right)
- còn lại → → (arrow-right)
Kèm sparkline polyline 7 điểm trên card.

### 6.3 Decay độ tươi
- ≤ 3 ngày kể từ dữ liệu mới nhất: opacity 1
- 4–7 ngày: opacity 0.75
- 8–14 ngày: opacity 0.55, hiện nhãn "cũ N ngày"
- > 14 ngày: opacity 0.4, đẩy xuống cuối dải

### 6.4 Streak người dùng
Chuỗi ngày liên tiếp có ít nhất 1 entry trong feedback.json hoặc decisions.json. Hiển thị badge góc phải header. Đứt chuỗi → reset về 0, không phạt gì thêm.

## 7. Màn hình (theo wireframe đã duyệt)

### 7.1 Trang chính
- Header: tên app + badge streak
- Dải tín hiệu sống: card ngang cuộn được. Mỗi card: mã tín hiệu, trạng thái + mũi tên + điểm, sparkline. Màu theo mức (mục 6.1), viền + chữ cùng ramp màu, decay bằng opacity
- Hộp nhiệm vụ: đọc từ pending-tasks.json, lọc task chưa làm và chưa hết hạn
  - Task tin sáng: inline 2 nút 👍/👎 ngay trên card — 1 chạm là ghi xong (note tùy chọn, mở rộng khi bấm giữ/bấm icon)
  - Task duyệt đề xuất: card có viền trái màu theo trạng thái tín hiệu liên quan, bấm mở màn chi tiết
- Trạng thái rỗng: "Hôm nay xong việc" + streak

### 7.2 Màn duyệt đề xuất
- Header: mã tín hiệu + lớp
- Khối "Cần đánh giá gì": hiển thị trường `context` của task — nổi bật, đọc trước khi quyết
- 2 metric card: Điểm, Tin cậy
- Input lý do: bắt buộc, 3 nút disable đến khi có nội dung
- 3 nút: Duyệt (teal) / Bỏ (red) / Hoãn (neutral). Hoãn → chọn nhanh thời hạn (3 ngày / 1 tuần / cuối tuần) ghi vào deferUntil
- Sau submit: quay về trang chính, task biến khỏi hộp, toast xác nhận ngắn

### 7.3 Màn cài đặt
- Nhập token (masked), nút kiểm tra kết nối (gọi GET repo), hiện ngày hết hạn token do người dùng tự nhập để app nhắc trước 7 ngày
- Nút xóa token

## 8. Luồng ghi GitHub API

1. GET `/repos/{owner}/policy-radar/contents/feedback/{file}` → lấy `content` (base64) + `sha`
2. Parse JSON, merge DEFAULT_STATE, append entry mới
3. PUT cùng endpoint với `content` mới (base64) + `sha` cũ + message commit dạng `feedback: fb-2026-07-17` hoặc `decision: dec-...`
4. Nếu 409 (sha conflict): GET lại rồi retry 1 lần
5. Nếu lỗi mạng/API: giữ entry trong hàng đợi localStorage (`pendingWrites`), banner "Chưa đồng bộ N mục — thử lại", tự retry khi mở app

## 9. Bài học kỹ thuật BẮT BUỘC áp dụng (từ các dự án trước)

1. **DEFAULT_STATE merge**: mọi state đọc từ localStorage hoặc JSON repo phải merge với default object trước khi dùng — không bao giờ giả định trường tồn tại
2. **Retry 429/529**: mọi call API có retry với backoff (tối đa 3 lần) cho lỗi rate-limit/server
3. **Functional updates**: mọi setState phụ thuộc state trước dùng dạng `setX(prev => ...)` — tránh stale closure
4. **Không rewrite phần đang chạy tốt**: chỉ thêm thư mục `app/` và `feedback/`, không đụng pipeline

## 10. Definition of Done v1

- [ ] App chạy trên GitHub Pages, mobile hiển thị tốt (viewport ~380px)
- [ ] Nhập token → kiểm tra kết nối thành công
- [ ] Phản hồi tin sáng 1 chạm → commit xuất hiện trong repo, đúng schema 5.2
- [ ] Duyệt/Bỏ/Hoãn đề xuất → commit đúng schema 5.3, có proposalSnapshot, lý do bắt buộc hoạt động
- [ ] Tín hiệu sống hiển thị đúng 4 mức, hysteresis không nhấp nháy, sparkline + decay chạy đúng
- [ ] Streak đếm đúng, đứt chuỗi reset đúng
- [ ] Offline/lỗi mạng: entry vào hàng đợi, đồng bộ lại được
- [ ] Task hết hạn (expiresAt) không hiện trong hộp nhiệm vụ
