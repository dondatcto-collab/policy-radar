// Hằng số cấu hình app đánh giá — SPEC-app-danh-gia-v1.md mục 6.
// Đây là file DUY NHẤT chỉnh ngưỡng/màu/hệ số, theo đúng chỉ dẫn spec.

export const GITHUB_OWNER = "dondatcto-collab";
export const GITHUB_REPO = "policy-radar";
export const GITHUB_BRANCH = "main";
export const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;
export const API_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

// Khung chấm v1.1 (CLAUDE.md #4) cho điểm dòng tiền diem_dong_tien_max: KL so nền 22đ
// + khối ngoại cấp mã 8đ + vị thế giá 10đ (phạt -10) → thang thiết kế tối đa 40đ.
// Tín hiệu sống hiển thị thang 0–10 cho gọn mắt, nên quy đổi bằng cách chia 4.
// Đổi hệ số này nếu khung chấm 03 v1.1 đổi thang điểm (phải có backtest — CLAUDE.md #4).
export const SCORE_RAW_MAX = 40;
export const SCORE_SCALE = SCORE_RAW_MAX / 10; // 4

// 4 mức trạng thái (mục 6.1) — thang 0–10 sau quy đổi
export const SIGNAL_LEVELS = [
  { key: "khoe", label: "Khỏe", min: 7.0, color: "#2bb3a3" }, // teal
  { key: "on", label: "Ổn", min: 5.5, color: "#4a90d9" }, // blue
  { key: "suy_yeu", label: "Suy yếu", min: 4.0, color: "#e8c34a" }, // amber
  { key: "xau", label: "Xấu", min: -Infinity, color: "#e5484d" }, // red
];

export const HYSTERESIS = 0.3;

// Xu hướng: hồi quy tuyến tính trên tối đa 7 phiên gần nhất, tối thiểu 5
export const TREND_WINDOW = 7;
export const TREND_MIN_POINTS = 5;
export const TREND_UP_SLOPE = 0.05;
export const TREND_DOWN_SLOPE = -0.05;

// Decay độ tươi (mục 6.3) — tính theo số ngày kể từ dữ liệu mới nhất của tín hiệu
export const DECAY_TIERS = [
  { maxDays: 3, opacity: 1, label: null },
  { maxDays: 7, opacity: 0.75, label: null },
  { maxDays: 14, opacity: 0.55, label: (d) => `cũ ${d} ngày` },
  { maxDays: Infinity, opacity: 0.4, label: (d) => `cũ ${d} ngày` },
];

export const LOCALSTORAGE_KEYS = {
  token: "pr_gh_token",
  tokenExpiry: "pr_gh_token_expiry",
  hysteresisState: "pr_signal_state",
  pendingWrites: "pr_pending_writes",
  streakCache: "pr_streak_cache",
  doneTasks: "pr_done_tasks",
};

export const RETRY_MAX_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 1500;

export const RADAR_HISTORY_DAYS = 14; // đủ để lấy 7 phiên gần nhất kể cả khi có ngày lỗi/thiếu
