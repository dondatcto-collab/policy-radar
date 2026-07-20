import Sparkline from "./Sparkline";
import { impactLevelFor } from "../lib/constants";

// Lớp 2 (bảng ngành + sparkline + tin gốc) và Lớp 3 (nút "Đọc tin gốc", chỉ hiện
// khi có link thật — không để chỗ trống nếu không có).
export default function TaskDetails({ payload, color }) {
  const sectors = payload?.sectors || [];
  const history = payload?.scoreHistory || [];
  const news = payload?.topNews || [];
  const readMoreLink = news.find((n) => n.link)?.link;

  return (
    <div className="task-details">
      {history.length >= 2 && <Sparkline points={history} color={color || "#4a90d9"} />}

      {payload?.aiSummary && (
        <div className="ai-summary">
          <div className="ai-summary-label">Nhận định AI</div>
          {payload.aiSummary
            .split("\n")
            .map((line) => line.replace(/^[-•*]\s*/, "").trim())
            .filter(Boolean)
            .map((line, i) => (
              <div key={i} className="ai-summary-line">{line}</div>
            ))}
        </div>
      )}

      {sectors.length > 0 && (
        <table className="sector-table">
          <thead>
            <tr>
              <th>Ngành</th>
              <th>Hôm nay</th>
              <th>Hôm qua</th>
              <th>Chênh lệch</th>
              <th>Tác động</th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((s) => {
              const impact = s.delta == null ? null : impactLevelFor(Math.abs(s.delta));
              return (
                <tr key={s.name}>
                  <td>{s.name}</td>
                  <td className="mono">{s.scoreToday ?? "—"}</td>
                  <td className="mono">{s.scoreYesterday ?? "—"}</td>
                  <td
                    className="mono"
                    style={{
                      color: s.delta > 0 ? "var(--khoe)" : s.delta < 0 ? "var(--xau)" : "var(--dim)",
                    }}
                  >
                    {s.delta == null
                      ? "—"
                      : s.delta > 0
                      ? `↑ +${s.delta}`
                      : s.delta < 0
                      ? `↓ ${s.delta}`
                      : "0"}
                  </td>
                  <td style={{ color: impact ? impact.color : "var(--dim)" }}>
                    {impact ? impact.label : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {payload?.aiRecommendation && (
        <div className="ai-recommend">
          <div className="ai-recommend-label">Khuyến nghị</div>
          {payload.aiRecommendation
            .split("\n")
            .map((line) => line.replace(/^[-•*]\s*/, "").trim())
            .filter(Boolean)
            .map((line, i) => (
              <div key={i} className="ai-recommend-line">{line}</div>
            ))}
          <div className="ai-recommend-disclaimer">Gợi ý tham khảo, không phải tư vấn đầu tư.</div>
        </div>
      )}

      {news.length > 0 && (
        <div className="news-list">
          {news.map((n, i) => (
            <div key={i} className="news-item">
              <div className="news-title">{n.title}</div>
              {n.source && <div className="news-source">{n.source}</div>}
            </div>
          ))}
        </div>
      )}

      {readMoreLink && (
        <a
          className="read-more-btn"
          href={readMoreLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          Đọc tin gốc ↗
        </a>
      )}
    </div>
  );
}
