import { useEffect, useState, useCallback } from "react";
import SignalStrip from "../components/SignalStrip";
import MorningFeedbackCard from "../components/MorningFeedbackCard";
import ProposalTaskCard from "../components/ProposalTaskCard";
import { readJsonPublic, writeEntryOrQueue } from "../lib/github";
import { buildSignals } from "../lib/signals";
import { mergePendingTasks, getDoneTaskIds, markTaskDone } from "../lib/storage";

function isoNow() {
  return new Date().toISOString();
}

export default function Home({ token, onOpenReview, showToast, streak, refreshStreak, refreshPending }) {
  const [signals, setSignals] = useState([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [signalsError, setSignalsError] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [doneIds, setDoneIds] = useState(() => getDoneTaskIds());

  const loadSignals = useCallback(async () => {
    setSignalsLoading(true);
    setSignalsError(null);
    try {
      const s = await buildSignals(token);
      setSignals(s);
    } catch (e) {
      setSignalsError(String(e.message || e));
    } finally {
      setSignalsLoading(false);
    }
  }, [token]);

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      const pendingRaw = await readJsonPublic("feedback/pending-tasks.json", token);
      const pending = mergePendingTasks(pendingRaw);
      setTasks(pending.tasks || []);
    } catch (e) {
      setTasksError(String(e.message || e));
    } finally {
      setTasksLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSignals();
    loadTasks();
  }, [loadSignals, loadTasks]);

  async function handleVote(task, rating, note) {
    setSubmitting(true);
    const date = (task.createdAt || isoNow()).slice(0, 10);
    const entry = {
      id: `fb-${date}`,
      date,
      reportId: `rpt-${date}`,
      rating,
      note: note || "",
      createdAt: isoNow(),
    };
    const result = await writeEntryOrQueue("feedback", entry, `feedback: ${entry.id}`, token);
    markTaskDone(task.id);
    setDoneIds((prev) => [...prev, task.id]);
    setSubmitting(false);
    showToast(result.queued ? "Đã lưu — chờ đồng bộ" : "Đã ghi nhận");
    loadTasks();
    refreshStreak();
    refreshPending();
  }

  const now = Date.now();
  const visibleTasks = tasks.filter((t) => {
    if (doneIds.includes(t.id)) return false;
    if (t.expiresAt && new Date(t.expiresAt).getTime() < now) return false;
    return true;
  });
  const morningTasks = visibleTasks.filter((t) => t.type === "morning_feedback");
  const proposalTasks = visibleTasks.filter((t) => t.type === "review_proposal");

  function signalColorFor(signalId) {
    const sig = signals.find((s) => s.id === signalId);
    return sig ? sig.color : undefined;
  }

  return (
    <>
      <SignalStrip signals={signals} loading={signalsLoading} error={signalsError} />

      <section className="block">
        <h2>Nhiệm vụ</h2>
        {tasksLoading && <div className="loading">Đang tải…</div>}
        {!tasksLoading && tasksError && (
          <div className="error-state">Không tải được nhiệm vụ — {tasksError}</div>
        )}
        {!tasksLoading && !tasksError && visibleTasks.length === 0 && (
          <div className="empty-state">
            <div className="big">✅</div>
            <div>Hôm nay xong việc</div>
            <div style={{ marginTop: 6 }}>Streak: {streak} ngày</div>
          </div>
        )}
        {!tasksLoading && !tasksError && morningTasks.map((t) => (
          <MorningFeedbackCard key={t.id} task={t} onVote={handleVote} submitting={submitting} />
        ))}
        {!tasksLoading && !tasksError && proposalTasks.map((t) => (
          <ProposalTaskCard key={t.id} task={t} color={signalColorFor(t.signalId)} onOpen={onOpenReview} />
        ))}
      </section>
    </>
  );
}
