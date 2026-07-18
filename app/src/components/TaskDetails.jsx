import Sparkline from "./Sparkline";

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

      {sectors.length > 0 && (
        <table className="sector-table">
          <thead>
            <tr>
              <th>Ngành</th>
              <th>Hôm nay</th>
              <th>Hôm qua</th>
              <th>Chênh lệch</th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((s) => (
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
                  {s.delta == null ? "—" : `${s.delta > 0 ? "+" : ""}${s.delta}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
