import Sparkline from "./Sparkline";

const ARROW = { up: "↗", down: "↘", flat: "→" };

export default function SignalCard({ signal }) {
  return (
    <div className="signal-card" style={{ opacity: signal.opacity, borderColor: signal.color + "55" }}>
      <div className="sig-name">{signal.name}</div>
      <div className="sig-score mono" style={{ color: signal.color }}>
        {signal.score != null ? signal.score.toFixed(1) : "—"}
        <span className="sig-arrow">{ARROW[signal.trend]}</span>
      </div>
      <div className="sig-level" style={{ color: signal.color }}>{signal.levelLabel}</div>
      <Sparkline points={signal.sparkline} color={signal.color} />
      {signal.staleLabel && <div className="sig-stale">{signal.staleLabel}</div>}
    </div>
  );
}
