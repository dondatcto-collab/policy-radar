import SignalCard from "./SignalCard";

export default function SignalStrip({ signals, loading, error }) {
  return (
    <section className="block">
      <h2>Tín hiệu sống</h2>
      {loading && <div className="loading">Đang tải…</div>}
      {!loading && error && <div className="error-state">Không tải được tín hiệu — {error}</div>}
      {!loading && !error && signals.length === 0 && (
        <div className="error-state">Chưa có dữ liệu radar</div>
      )}
      {!loading && !error && signals.length > 0 && (
        <div className="signal-strip">
          {signals.map((s) => (
            <SignalCard key={s.id} signal={s} />
          ))}
        </div>
      )}
    </section>
  );
}
