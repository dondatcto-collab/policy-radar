import { useState } from "react";
import { writeEntryOrQueue } from "../lib/github";
import { markTaskDone } from "../lib/storage";

const CONFIDENCE_LABEL = { low: "Thấp", medium: "Trung bình", high: "Cao" };

function dateCompact(d) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function nextSaturday(from) {
  const d = new Date(from);
  const day = d.getDay(); // 0=CN..6=T7
  const diff = (6 - day + 7) % 7;
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
  d.setHours(9, 0, 0, 0);
  return d;
}

function deferDate(kind) {
  const now = new Date();
  if (kind === "3d") {
    const d = new Date(now);
    d.setDate(d.getDate() + 3);
    return d;
  }
  if (kind === "1w") {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return d;
  }
  if (kind === "weekend") return nextSaturday(now);
  return null;
}

const DEFER_OPTIONS = [
  { key: "3d", label: "3 ngày" },
  { key: "1w", label: "1 tuần" },
  { key: "weekend", label: "Cuối tuần" },
];

export default function ReviewProposal({ task, token, onBack, showToast, refreshPending }) {
  const [reason, setReason] = useState("");
  const [showDefer, setShowDefer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const payload = task.payload || {};
  const canSubmit = reason.trim().length > 0 && !submitting;

  async function submit(decision, deferUntilDate) {
    if (!canSubmit) return;
    setSubmitting(true);
    const now = new Date();
    const entry = {
      id: `dec-${dateCompact(now)}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
      taskId: task.id,
      signalId: task.signalId,
      proposalSnapshot: JSON.parse(JSON.stringify(payload)),
      decision,
      reason: reason.trim(),
      deferUntil: deferUntilDate ? deferUntilDate.toISOString() : null,
      decidedAt: now.toISOString(),
    };
    const result = await writeEntryOrQueue("decisions", entry, `decision: ${entry.id}`, token);
    markTaskDone(task.id);
    setSubmitting(false);
    showToast(result.queued ? "Đã lưu — chờ đồng bộ" : "Đã ghi quyết định");
    refreshPending();
    onBack();
  }

  return (
    <>
      <div className="review-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div>
          <h2>{task.signalId}</h2>
          <div className="layer">Lớp {payload.layer ?? "—"}</div>
        </div>
      </div>

      <div className="context-block">
        <div className="label">Cần đánh giá gì</div>
        {task.context}
      </div>

      <div className="metric-row">
        <div className="metric-card">
          <div className="m-label">Điểm</div>
          <div className="m-value mono">{payload.score ?? "—"}</div>
        </div>
        <div className="metric-card">
          <div className="m-label">Tin cậy</div>
          <div className="m-value">{CONFIDENCE_LABEL[payload.confidence] || payload.confidence || "—"}</div>
        </div>
      </div>

      <label className="reason-label" htmlFor="reason">Lý do (bắt buộc)</label>
      <textarea
        id="reason"
        className="reason-input"
        placeholder="1 dòng lý do quyết định…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      {showDefer && (
        <div className="defer-picks">
          {DEFER_OPTIONS.map((opt) => (
            <button key={opt.key} onClick={() => submit("defer", deferDate(opt.key))} disabled={!canSubmit}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div className="decision-actions">
        <button className="btn-decision approve" disabled={!canSubmit} onClick={() => submit("approve", null)}>
          Duyệt
        </button>
        <button className="btn-decision reject" disabled={!canSubmit} onClick={() => submit("reject", null)}>
          Bỏ
        </button>
        <button className="btn-decision defer" disabled={!canSubmit} onClick={() => setShowDefer((v) => !v)}>
          Hoãn
        </button>
      </div>
    </>
  );
}
