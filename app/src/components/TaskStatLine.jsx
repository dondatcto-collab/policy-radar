// Lớp 1 — luôn hiện trên thẻ, không cần bấm: điểm chung + chênh lệch so hôm qua.
export default function TaskStatLine({ payload }) {
  const score = payload?.score;
  const delta = payload?.deltaVsYesterday;
  if (score == null && delta == null) return null;

  const deltaColor = delta > 0 ? "var(--khoe)" : delta < 0 ? "var(--xau)" : "var(--dim)";
  const deltaText =
    delta > 0 ? `Tăng ${delta} so với hôm qua`
    : delta < 0 ? `Giảm ${Math.abs(delta)} so với hôm qua`
    : "Không đổi so với hôm qua";

  return (
    <div className="task-stat-line mono">
      {score != null && <span className="stat-score">{score}/10</span>}
      {delta != null && (
        <span className="stat-delta" style={{ color: deltaColor }}>
          {deltaText}
        </span>
      )}
    </div>
  );
}
