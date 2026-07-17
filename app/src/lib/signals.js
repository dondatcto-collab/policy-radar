// Tín hiệu sống — SPEC mục 6. Nguồn: lịch sử data/radar-YYYY-MM-DD.json (CHỈ ĐỌC).
import { listDir, readJsonPublic } from "./github";
import { getHysteresisState, setHysteresisState } from "./storage";
import {
  SCORE_SCALE,
  SIGNAL_LEVELS,
  HYSTERESIS,
  TREND_WINDOW,
  TREND_MIN_POINTS,
  TREND_UP_SLOPE,
  TREND_DOWN_SLOPE,
  DECAY_TIERS,
  RADAR_HISTORY_DAYS,
} from "./constants";

function leastSquaresSlope(ys) {
  const n = ys.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (ys[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function trendFromSlope(slope) {
  if (slope > TREND_UP_SLOPE) return "up";
  if (slope < TREND_DOWN_SLOPE) return "down";
  return "flat";
}

// Xem mục 6.1: lên hạng phải vượt ngưỡng-trên+0.3, xuống hạng phải thủng ngưỡng-dưới-0.3,
// giữ nguyên trạng thái phiên trước nếu chưa vượt đệm — chống nhấp nháy.
export function resolveLevel(score, prevKey) {
  if (score == null) return prevKey || SIGNAL_LEVELS[SIGNAL_LEVELS.length - 1].key;
  if (!prevKey) {
    return (SIGNAL_LEVELS.find((l) => score >= l.min) || SIGNAL_LEVELS[SIGNAL_LEVELS.length - 1]).key;
  }
  const prevIdx = SIGNAL_LEVELS.findIndex((l) => l.key === prevKey);
  if (prevIdx === -1) {
    return (SIGNAL_LEVELS.find((l) => score >= l.min) || SIGNAL_LEVELS[SIGNAL_LEVELS.length - 1]).key;
  }
  // Lên hạng: kiểm tra từ hạng cao nhất xuống, lấy hạng cao nhất đủ điều kiện (vượt ngưỡng+đệm)
  for (let i = 0; i < prevIdx; i++) {
    if (score >= SIGNAL_LEVELS[i].min + HYSTERESIS) return SIGNAL_LEVELS[i].key;
  }
  // Xuống hạng: chỉ khi thủng ngưỡng-dưới của hạng hiện tại trừ đệm
  const prevMin = SIGNAL_LEVELS[prevIdx].min;
  if (score < prevMin - HYSTERESIS) {
    for (let i = prevIdx + 1; i < SIGNAL_LEVELS.length; i++) {
      if (score >= SIGNAL_LEVELS[i].min) return SIGNAL_LEVELS[i].key;
    }
    return SIGNAL_LEVELS[SIGNAL_LEVELS.length - 1].key;
  }
  return prevKey;
}

function decayFor(days) {
  const tier = DECAY_TIERS.find((t) => days <= t.maxDays);
  return { opacity: tier.opacity, staleLabel: tier.label ? tier.label(days) : null };
}

function daysBetween(dateStr, ref = new Date()) {
  const d = new Date(dateStr + "T00:00:00Z");
  const r = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  return Math.round((r - d) / 86400000);
}

async function loadRadarHistory(token) {
  const files = await listDir("data", token);
  const names = files
    .map((f) => f.name)
    .filter((n) => /^radar-\d{4}-\d{2}-\d{2}\.json$/.test(n))
    .sort()
    .slice(-RADAR_HISTORY_DAYS);
  const jsons = await Promise.all(
    names.map((name) => readJsonPublic(`data/${name}`, token).catch(() => null))
  );
  return names
    .map((name, i) => ({ date: name.match(/\d{4}-\d{2}-\d{2}/)[0], data: jsons[i] }))
    .filter((x) => x.data)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

// Trả về mảng tín hiệu đã tính state/trend/decay, sẵn sàng render SignalStrip.
export async function buildSignals(token) {
  const history = await loadRadarHistory(token);
  if (history.length === 0) return [];

  const latest = history[history.length - 1];
  const todayRef = new Date();
  const freshnessDays = daysBetween(latest.date, todayRef);
  const { opacity, staleLabel } = decayFor(freshnessDays);

  const prevState = getHysteresisState();
  const nextState = { ...prevState };

  const nhomIds = Object.keys(latest.data.nhom || {});
  const signals = nhomIds.map((id) => {
    const name = latest.data.nhom[id]?.ten || id;
    const rawSeries = history
      .map((h) => ({ date: h.date, raw: h.data.nhom?.[id]?.diem_dong_tien_max }))
      .filter((p) => typeof p.raw === "number");
    const window = rawSeries.slice(-TREND_WINDOW);
    const normalized = window.map((p) => Math.max(0, Math.min(10, p.raw / SCORE_SCALE)));

    const currentScore = normalized.length ? normalized[normalized.length - 1] : null;
    const slope = normalized.length >= TREND_MIN_POINTS ? leastSquaresSlope(normalized) : 0;
    const trend = normalized.length >= TREND_MIN_POINTS ? trendFromSlope(slope) : "flat";

    const signalId = `sig-${id}`;
    const levelKey = resolveLevel(currentScore, prevState[signalId]);
    nextState[signalId] = levelKey;
    const level = SIGNAL_LEVELS.find((l) => l.key === levelKey);

    return {
      id: signalId,
      nhomId: id,
      name,
      score: currentScore,
      sparkline: normalized,
      trend,
      level: levelKey,
      color: level.color,
      levelLabel: level.label,
      opacity,
      staleLabel,
      freshnessDays,
      latestDate: latest.date,
    };
  });

  setHysteresisState(nextState);
  // đẩy tín hiệu quá cũ (>14 ngày) xuống cuối dải — mục 6.3
  return signals.sort((a, b) => (a.freshnessDays > 14) - (b.freshnessDays > 14));
}
