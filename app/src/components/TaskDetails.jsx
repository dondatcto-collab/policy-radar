import { useState, Fragment } from "react";
import Sparkline from "./Sparkline";
import { impactLevelFor } from "../lib/constants";

// Lọc tin theo ngành: khớp đúng trường sector (Gemini gắn qua nhom), hoặc dự
// phòng tên ngành xuất hiện trong tiêu đề (payload không có sector thì vẫn lọc
// được phần nào nhờ fallback này).
function newsForSector(news, sectorName) {
  return news.filter((n) => n.sector === sectorName || (n.title && n.title.includes(sectorName)));
}

// Lớp 2 (bảng ngành + sparkline + tin gốc) và Lớp 3 (nút "Đọc tin gốc", chỉ hiện
// khi có link thật — không để chỗ trống nếu không có).
export default function TaskDetails({ payload, color }) {
  const [expandedSector, setExpandedSector] = useState(null);

  const sectors = payload?.sectors || [];
  const history = payload?.scoreHistory || [];
  const news = payload?.topNews || [];
  const sectorNotes = payload?.sectorNotes || {};
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
              const isOpen = expandedSector === s.name;
              return (
                <Fragment key={s.name}>
                  <tr
                    className="sector-row"
                    onClick={() => setExpandedSector(isOpen ? null : s.name)}
                  >
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
                  {isOpen && (
                    <tr className="sector-accordion-row">
                      <td colSpan={5}>
                        <div className="sector-accordion">
                          {sectorNotes[s.name] && (
                            <div className="sector-note">{sectorNotes[s.name]}</div>
                          )}
                          {history.length >= 2 && (
                            <Sparkline points={history} color={color || "#4a90d9"} />
                          )}
                          {(() => {
                            const sectorNews = newsForSector(news, s.name);
                            return sectorNews.length > 0 ? (
                              <div className="news-list">
                                {sectorNews.map((n, i) => (
                                  <div key={i} className="news-item">
                                    <div className="news-title">{n.title}</div>
                                    {n.source && <div className="news-source">{n.source}</div>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="no-sector-news">Không có tin riêng cho ngành này</div>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
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
