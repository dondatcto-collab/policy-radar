import { useState } from "react";

export default function MorningFeedbackCard({ task, onVote, submitting }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");

  function vote(rating) {
    onVote(task, rating, note);
  }

  return (
    <div className="card morning-card">
      <div className="ctx">{task.context}</div>
      <div className="morning-actions">
        <button className="btn-vote on" disabled={submitting} onClick={() => vote("on_target")}>👍</button>
        <button className="btn-vote noise" disabled={submitting} onClick={() => vote("noise")}>👎</button>
      </div>
      <div className="note-toggle" onClick={() => setNoteOpen((v) => !v)}>
        {noteOpen ? "ẩn ghi chú" : "+ ghi chú (tùy chọn)"}
      </div>
      {noteOpen && (
        <textarea
          className="note-input"
          rows={2}
          placeholder="Ghi chú ngắn…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      )}
    </div>
  );
}
