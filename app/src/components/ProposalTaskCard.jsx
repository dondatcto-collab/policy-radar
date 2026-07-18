import { useState } from "react";
import TaskStatLine from "./TaskStatLine";
import TaskDetails from "./TaskDetails";

export default function ProposalTaskCard({ task, color, onOpen }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const payload = task.payload || {};

  function toggleDetails(e) {
    e.stopPropagation();
    setDetailsOpen((v) => !v);
  }

  return (
    <div className="card proposal-card" style={{ borderLeft: `3px solid ${color || "#4a90d9"}` }} onClick={() => onOpen(task)}>
      <div className="p-title">{task.signalId}</div>
      <div className="p-sub">{task.context}</div>
      <TaskStatLine payload={payload} />
      <button className="details-toggle" onClick={toggleDetails}>
        {detailsOpen ? "Thu gọn ▴" : "Xem chi tiết ▾"}
      </button>
      {detailsOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <TaskDetails payload={payload} color={color} />
        </div>
      )}
    </div>
  );
}
