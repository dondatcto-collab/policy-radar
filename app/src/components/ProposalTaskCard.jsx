export default function ProposalTaskCard({ task, color, onOpen }) {
  return (
    <div className="card proposal-card" style={{ borderLeft: `3px solid ${color || "#4a90d9"}` }} onClick={() => onOpen(task)}>
      <div className="p-title">{task.signalId}</div>
      <div className="p-sub">{task.context}</div>
    </div>
  );
}
