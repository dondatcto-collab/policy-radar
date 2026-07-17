export default function SyncBanner({ count, onRetry, retrying }) {
  if (!count) return null;
  return (
    <div className="sync-banner">
      <span>Chưa đồng bộ {count} mục — thử lại</span>
      <button onClick={onRetry} disabled={retrying}>{retrying ? "Đang thử…" : "Thử lại"}</button>
    </div>
  );
}
