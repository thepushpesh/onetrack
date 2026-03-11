import { useMemo } from "react";

function toISODateLocal(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    .toISOString()
    .slice(0, 10);
}

function parseISODateToLocalMidnight(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const str = String(value).slice(0, 10);
  const [y, m, d] = str.split("-").map((n) => Number(n));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function diffDaysLocal(a, b) {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86400000);
}

function buildCompletedByDate(logs) {
  const map = new Map();
  (logs ?? []).forEach((log) => {
    const dt = parseISODateToLocalMidnight(log?.log_date);
    if (!dt) return;
    const key = toISODateLocal(dt);
    const completed = Boolean(log?.completed);

    // If there are multiple rows for the same date, treat any "true" as completed.
    const prev = map.get(key);
    map.set(key, Boolean(prev) || completed);
  });
  return map;
}

export default function useStreak(dailyLogs) {
  return useMemo(() => {
    const completedByDate = buildCompletedByDate(dailyLogs);
    const today = parseISODateToLocalMidnight(new Date());
    const todayKey = toISODateLocal(today);

    let currentStreak = 0;
    let startDate = null;

    if (completedByDate.has(todayKey)) {
      if (!completedByDate.get(todayKey)) {
        currentStreak = 0;
      } else {
        startDate = today;
      }
    } else {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = yesterday;
    }

    if (startDate) {
      const cursor = new Date(startDate);
      while (true) {
        const key = toISODateLocal(cursor);
        if (completedByDate.get(key) !== true) break;
        currentStreak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
    }

    const completedDates = Array.from(completedByDate.entries())
      .filter(([, completed]) => completed === true)
      .map(([key]) => parseISODateToLocalMidnight(key))
      .filter(Boolean)
      .sort((a, b) => a.getTime() - b.getTime());

    let longestStreak = 0;
    let run = 0;
    for (let i = 0; i < completedDates.length; i += 1) {
      if (i === 0) {
        run = 1;
      } else {
        const gap = diffDaysLocal(completedDates[i - 1], completedDates[i]);
        run = gap === 1 ? run + 1 : 1;
      }
      if (run > longestStreak) longestStreak = run;
    }

    return { currentStreak, longestStreak };
  }, [dailyLogs]);
}

