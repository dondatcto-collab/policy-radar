import { REASON_LABELS } from "../lib/github";

export default function SyncBanner({ count, reason, onRetry, retrying }) {
  if (!count) return null;
  const reasonText = reason ? REASON_LABELS[reason] || reason : null;
  return (
    <div className="sync-banner">
      <span>Chưa đồng bộ {count} mục{reasonText ? ` — ${reasonText}` : ""}</span>
      <button onClick={onRetry} disabled={retrying}>{retrying ? "Đang thử…" : "Thử lại"}</button>
    </div>
  );
}
