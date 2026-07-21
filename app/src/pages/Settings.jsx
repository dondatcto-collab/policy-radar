import { useState } from "react";
import { testConnection, REASON_LABELS } from "../lib/github";
import {
  setToken as saveToken,
  clearToken,
  setTokenExpiry as saveExpiry,
  getPendingWrites,
  removePendingWrite,
} from "../lib/storage";

const KIND_LABELS = { feedback: "Phản hồi tin sáng", decisions: "Quyết định đề xuất" };

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

function queueItemDate(item) {
  const raw = item.entry?.createdAt || item.entry?.decidedAt || "";
  return raw.slice(0, 10) || "—";
}

export default function Settings({ token, tokenExpiry, onTokenUpdated, refreshPending }) {
  const [tokenInput, setTokenInput] = useState(token || "");
  const [expiryInput, setExpiryInput] = useState(tokenExpiry || "");
  const [status, setStatus] = useState(null); // {ok, text}
  const [checking, setChecking] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [queue, setQueue] = useState(() => getPendingWrites());

  function toggleQueue() {
    if (!queueOpen) setQueue(getPendingWrites());
    setQueueOpen((v) => !v);
  }

  function handleDeleteQueueItem(localId) {
    removePendingWrite(localId);
    setQueue(getPendingWrites());
    refreshPending?.();
  }

  function handleSave() {
    saveToken(tokenInput.trim());
    saveExpiry(expiryInput);
    onTokenUpdated(tokenInput.trim(), expiryInput);
    setStatus(null);
  }

  async function handleTest() {
    setChecking(true);
    setStatus(null);
    const res = await testConnection(tokenInput.trim());
    setChecking(false);
    if (res.ok) {
      setStatus({ ok: true, text: `Kết nối OK — ${res.fullName}${res.private ? " (private)" : ""}` });
    } else {
      setStatus({ ok: false, text: `Lỗi kết nối — HTTP ${res.status || 0}${res.error ? `: ${res.error}` : ""}` });
    }
  }

  function handleDelete() {
    clearToken();
    setTokenInput("");
    setExpiryInput("");
    setStatus(null);
    onTokenUpdated("", "");
  }

  const remain = daysUntil(expiryInput);
  const expiryWarn = remain !== null && remain <= 7;

  return (
    <>
      <section className="block">
        <h2>Cài đặt</h2>

        <div className="settings-field">
          <label htmlFor="token">Personal Access Token (fine-grained)</label>
          <input
            id="token"
            type="password"
            placeholder="github_pat_…"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            autoComplete="off"
          />
          <div className="hint">Scope: repo policy-radar · Contents read/write · hạn 90 ngày</div>
        </div>

        <div className="settings-field">
          <label htmlFor="expiry">Ngày hết hạn token (tự nhập)</label>
          <input
            id="expiry"
            type="date"
            value={expiryInput}
            onChange={(e) => setExpiryInput(e.target.value)}
          />
          {expiryInput && (
            <div className={`hint ${expiryWarn ? "warn" : ""}`}>
              {remain >= 0 ? `Còn ${remain} ngày` : `Đã hết hạn ${-remain} ngày trước`}
              {expiryWarn ? " — sắp hết hạn, tạo token mới" : ""}
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={handleSave}>Lưu</button>
        <button className="btn-primary" onClick={handleTest} disabled={checking || !tokenInput.trim()}>
          {checking ? "Đang kiểm tra…" : "Kiểm tra kết nối"}
        </button>
        {status && <div className={`conn-status ${status.ok ? "ok" : "err"}`}>{status.text}</div>}

        <div style={{ height: 12 }} />
        <button className="btn-danger" onClick={handleDelete}>Xóa token</button>
      </section>

      <section className="block">
        <button className="queue-toggle" onClick={toggleQueue}>
          {queueOpen ? "Ẩn hàng đợi ▴" : "Xem hàng đợi ▾"}
        </button>
        {queueOpen && (
          queue.length === 0 ? (
            <div className="hint">Hàng đợi trống.</div>
          ) : (
            <div className="queue-list">
              {queue.map((item) => (
                <div key={item.localId} className="queue-item">
                  <div className="queue-item-main">
                    <span className="mono">{item.entry?.id || item.localId}</span>
                    <span className="queue-item-kind">{KIND_LABELS[item.kind] || item.kind}</span>
                  </div>
                  <div className="queue-item-meta">
                    {queueItemDate(item)}
                    {item.reason ? ` · ${REASON_LABELS[item.reason] || item.reason}` : ""}
                  </div>
                  <button className="queue-item-delete" onClick={() => handleDeleteQueueItem(item.localId)}>
                    Xóa mục này
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </section>
    </>
  );
}
