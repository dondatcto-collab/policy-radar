// Streak người dùng — SPEC mục 6.4: chuỗi ngày liên tiếp có >=1 entry trong
// feedback.json hoặc decisions.json. Đứt chuỗi → reset về 0, không phạt gì thêm.

function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d);
}

export function computeStreak(feedback, decisions, today = new Date()) {
  const dateSet = new Set();
  (feedback?.entries || []).forEach((e) => e.date && dateSet.add(e.date));
  (decisions?.entries || []).forEach((e) => {
    if (e.decidedAt) dateSet.add(e.decidedAt.slice(0, 10));
  });

  const todayStr = toLocalDateStr(today);
  let cursor;
  if (dateSet.has(todayStr)) {
    cursor = todayStr;
  } else {
    const yesterday = addDays(todayStr, -1);
    if (dateSet.has(yesterday)) {
      cursor = yesterday;
    } else {
      return 0; // đứt chuỗi — hôm nay và hôm qua đều chưa có entry
    }
  }

  let streak = 0;
  while (dateSet.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
