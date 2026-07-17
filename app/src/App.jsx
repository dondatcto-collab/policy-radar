import { useCallback, useEffect, useState } from "react";
import Home from "./pages/Home";
import ReviewProposal from "./pages/ReviewProposal";
import Settings from "./pages/Settings";
import Toast from "./components/Toast";
import SyncBanner from "./components/SyncBanner";
import { readJsonPublic, flushPendingWrites } from "./lib/github";
import { mergeFeedback, mergeDecisions, getToken, getTokenExpiry, getPendingWrites } from "./lib/storage";
import { computeStreak } from "./lib/streak";

export default function App() {
  const [screen, setScreen] = useState("home"); // home | review | settings
  const [reviewTask, setReviewTask] = useState(null);
  const [token, setTokenState] = useState(() => getToken());
  const [tokenExpiry, setTokenExpiryState] = useState(() => getTokenExpiry());
  const [toastMsg, setToastMsg] = useState("");
  const [streak, setStreak] = useState(0);
  const [pendingCount, setPendingCount] = useState(() => getPendingWrites().length);
  const [retrying, setRetrying] = useState(false);

  const showToast = useCallback((msg) => setToastMsg(msg), []);
  const refreshPending = useCallback(() => setPendingCount(getPendingWrites().length), []);

  const refreshStreak = useCallback(async () => {
    try {
      const [feedbackRaw, decisionsRaw] = await Promise.all([
        readJsonPublic("feedback/feedback.json", token),
        readJsonPublic("feedback/decisions.json", token),
      ]);
      setStreak(computeStreak(mergeFeedback(feedbackRaw), mergeDecisions(decisionsRaw)));
    } catch {
      // im lặng — streak không phải dữ liệu quan trọng, không cần cờ lỗi riêng
    }
  }, [token]);

  useEffect(() => {
    refreshStreak();
    refreshPending();
  }, [refreshStreak, refreshPending]);

  useEffect(() => {
    if (!token || pendingCount === 0) return;
    flushPendingWrites(token).then(() => refreshPending());
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  function openReview(task) {
    setReviewTask(task);
    setScreen("review");
  }
  function backHome() {
    setReviewTask(null);
    setScreen("home");
    refreshStreak();
  }

  async function handleRetrySync() {
    setRetrying(true);
    const { succeeded, remaining } = await flushPendingWrites(token);
    setRetrying(false);
    refreshPending();
    if (succeeded > 0) showToast(`Đã đồng bộ ${succeeded} mục${remaining ? `, còn ${remaining}` : ""}`);
    else showToast("Vẫn chưa đồng bộ được — thử lại sau");
  }

  function handleTokenUpdated(newToken, newExpiry) {
    setTokenState(newToken);
    setTokenExpiryState(newExpiry);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Policy Radar</h1>
        <span className="streak-badge">🔥 {streak}</span>
      </header>

      <main>
        <SyncBanner count={pendingCount} onRetry={handleRetrySync} retrying={retrying} />

        {screen === "home" && (
          <Home
            token={token}
            onOpenReview={openReview}
            showToast={showToast}
            streak={streak}
            refreshStreak={refreshStreak}
            refreshPending={refreshPending}
          />
        )}
        {screen === "review" && reviewTask && (
          <ReviewProposal
            task={reviewTask}
            token={token}
            onBack={backHome}
            showToast={showToast}
            refreshPending={refreshPending}
          />
        )}
        {screen === "settings" && (
          <Settings token={token} tokenExpiry={tokenExpiry} onTokenUpdated={handleTokenUpdated} />
        )}
      </main>

      {screen !== "review" && (
        <nav className="bottom-nav">
          <button className={screen === "home" ? "active" : ""} onClick={() => setScreen("home")}>Trang chính</button>
          <button className={screen === "settings" ? "active" : ""} onClick={() => setScreen("settings")}>Cài đặt</button>
        </nav>
      )}

      <Toast message={toastMsg} onDone={() => setToastMsg("")} />
    </div>
  );
}
