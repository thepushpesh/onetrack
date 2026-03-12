"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import createClient from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function parseISODate(value) {
  // value like "2026-03-10" -> local Date at midnight
  const [y, m, d] = String(value).split("-").map((n) => Number(n));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function diffDays(fromDate, toDate) {
  const a = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const b = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  const ms = b.getTime() - a.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function getMonthMeta(today) {
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-based
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = first.getDay(); // 0=Sun
  return { year, month, daysInMonth, startWeekday };
}

function computeStreakCount(logs) {
  // Streak = consecutive days completed=true, counting backwards from most recent completed day.
  const completedDates = logs
    .filter((l) => l?.completed && l?.log_date)
    .map((l) => String(l.log_date))
    .filter(Boolean);

  if (!completedDates.length) return 0;

  const set = new Set(completedDates);
  const mostRecent = completedDates
    .map((d) => parseISODate(d))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  if (!mostRecent) return 0;

  let streak = 0;
  const cursor = new Date(mostRecent);
  while (true) {
    const key = toISODate(cursor);
    if (!set.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function computeLongestStreak(logs) {
  const completedDates = (logs ?? [])
    .filter((l) => l?.completed && l?.log_date)
    .map((l) => String(l.log_date))
    .filter(Boolean);

  if (!completedDates.length) return 0;

  const unique = Array.from(new Set(completedDates));
  const dates = unique
    .map((d) => parseISODate(d))
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());

  let best = 0;
  let run = 0;

  for (let i = 0; i < dates.length; i += 1) {
    if (i === 0) {
      run = 1;
    } else {
      const prev = dates[i - 1];
      const cur = dates[i];
      const gap = diffDays(prev, cur);
      run = gap === 1 ? run + 1 : 1;
    }
    if (run > best) best = run;
  }

  return best;
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState(null);
  const [logs, setLogs] = useState([]);
  const [todayLog, setTodayLog] = useState(null);

  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState(false);

  const [focusInput, setFocusInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [error, setError] = useState("");

  const logsByDate = useMemo(() => {
    const map = new Map();
    logs.forEach((l) => {
      if (!l?.log_date) return;
      map.set(String(l.log_date), l);
    });
    return map;
  }, [logs]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        const user = data?.user;
        if (!user) {
          router.replace("/login");
          return;
        }

        const { data: goals, error: goalError } = await supabase
          .from("goals")
          .select("*")
          .eq("user_id", user.id)
          .limit(1);

        if (goalError) throw goalError;

        const firstGoal = goals?.[0] ?? null;
        if (!firstGoal) {
          router.replace("/onboarding");
          return;
        }

        const { data: dailyLogs, error: logsError } = await supabase
          .from("daily_logs")
          .select("*")
          .eq("user_id", user.id);

        if (logsError) throw logsError;

        const todayKey = toISODate(new Date());
        const todays = (dailyLogs ?? []).find((l) => String(l.log_date) === todayKey) ?? null;

        if (!cancelled) {
          setGoal(firstGoal);
          setLogs(dailyLogs ?? []);
          setTodayLog(todays);
          setFocusInput(todays?.focus_task ?? "");
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  useEffect(() => {
    let cancelled = false;

    const fetchQuote = async () => {
      try {
        setQuoteError(false);
        const response = await fetch("https://zenquotes.io/api/today", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Quote request failed");
        const data = await response.json();
        const item = data?.[0];
        if (!item?.q || !item?.a) throw new Error("Quote parse failed");
        if (!cancelled) setQuote({ text: item.q, author: item.a });
      } catch {
        if (!cancelled) {
          setQuoteError(true);
          setQuote(null);
        }
      }
    };

    fetchQuote();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    setError("");
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleSetFocus = async () => {
    if (!goal) return;
    setError("");
    setActionMessage("");
    const task = focusInput.trim();
    if (!task) {
      setError("Please write your one focus task for today.");
      return;
    }

    setActionLoading(true);
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const user = data?.user;
      if (!user) {
        router.replace("/login");
        return;
      }

      const todayKey = toISODate(new Date());
      const { data: inserted, error: insertError } = await supabase
        .from("daily_logs")
        .insert({
          user_id: user.id,
          goal_id: goal.id,
          log_date: todayKey,
          focus_task: task,
          completed: false,
        })
        .select("*")
        .limit(1);

      if (insertError) throw insertError;
      const newRow = inserted?.[0] ?? null;
      if (!newRow) throw new Error("Failed to save today's focus.");

      setTodayLog(newRow);
      setLogs((prev) => [newRow, ...prev.filter((l) => l.id !== newRow.id)]);
      setActionMessage("Today's focus set.");
    } catch (e) {
      setError(e?.message || "Failed to save today's focus.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetCompleted = async (completed) => {
    if (!todayLog) return;
    setError("");
    setActionMessage("");
    setActionLoading(true);
    try {
      const { data: updated, error: updateError } = await supabase
        .from("daily_logs")
        .update({ completed })
        .eq("id", todayLog.id)
        .select("*")
        .limit(1);

      if (updateError) throw updateError;
      const row = updated?.[0] ?? null;
      if (!row) throw new Error("Failed to update today's status.");

      setTodayLog(row);
      setLogs((prev) => prev.map((l) => (l.id === row.id ? row : l)));
      setActionMessage(completed ? "Marked as completed." : "Not today. Kept as incomplete.");
    } catch (e) {
      setError(e?.message || "Failed to update today's status.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f5f3ff] to-[#ede9fe]">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  if (!goal) return null;

  const today = new Date();
  const todayKey = toISODate(today);
  const deadlineDate = goal.deadline ? parseISODate(goal.deadline) : null;
  const daysRemaining = deadlineDate ? diffDays(today, deadlineDate) : null;
  const deadlinePassed = typeof daysRemaining === "number" && daysRemaining < 0;

  const streakCount = computeStreakCount(logs);
  const longestStreak = computeLongestStreak(logs);

  const { year, month, daysInMonth, startWeekday } = getMonthMeta(today);
  const monthName = today.toLocaleString(undefined, { month: "long" });

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f5f3ff] to-[#ede9fe]">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-[480px] items-center justify-between px-6 py-4">
          <div className="text-xl font-bold text-purple-700">OneTrack</div>
          <div className="flex items-center gap-4">
            <a
              href="#goal"
              className="rounded-xl border border-purple-600 px-6 py-3 text-sm font-semibold text-purple-600 transition-all duration-200 hover:bg-purple-50"
            >
              My Goal
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-medium text-red-500 hover:text-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[480px] space-y-5 px-4 py-6">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section id="goal" className="rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 p-6 text-white">
          <div className="text-center">
            {deadlinePassed ? (
              <>
                <div className="text-2xl font-black">Goal deadline reached</div>
                <div className="mt-1 text-sm text-purple-200">Your deadline was {goal.deadline}</div>
              </>
            ) : (
              <>
                <div className="text-7xl font-black leading-none">
                  {typeof daysRemaining === "number" ? daysRemaining : "—"}
                </div>
                <div className="mt-2 text-lg text-purple-200">days remaining</div>
              </>
            )}
          </div>

          <div className="my-5 border-t border-purple-500" />

          <div className="text-purple-300 text-xs font-semibold uppercase tracking-wider">
            Your goal
          </div>
          <div className="mt-2 text-lg font-medium">{goal.goal_text}</div>
          {goal.deadline ? (
            <div className="mt-2 text-sm text-purple-200">Deadline: {goal.deadline}</div>
          ) : null}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="text-sm italic text-gray-500">Daily Inspiration</div>
          <div className="mt-2 text-6xl font-serif leading-none text-purple-200">&ldquo;</div>
          <div className="mt-2 text-base italic text-gray-700">
            {quoteError ? (
              <>The secret of getting ahead is getting started.</>
            ) : quote ? (
              <>{quote.text}</>
            ) : (
              <span className="text-gray-400">Loading...</span>
            )}
          </div>
          <div className="mt-2 text-sm font-medium text-purple-600">
            {quoteError ? "— Mark Twain" : quote ? `— ${quote.author}` : ""}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">What&apos;s your one thing today?</h2>

          {!todayLog ? (
            <>
              <textarea
                className="mt-4 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ minHeight: 100 }}
                placeholder="Write your one focus task for today..."
                value={focusInput}
                onChange={(e) => setFocusInput(e.target.value)}
              />
              <button
                type="button"
                className="mt-4 w-full rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:bg-purple-700 disabled:opacity-60"
                onClick={handleSetFocus}
                disabled={actionLoading || !focusInput.trim()}
              >
                {actionLoading ? "Saving..." : "Set Today's Focus"}
              </button>
            </>
          ) : todayLog.completed ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="text-sm font-semibold text-green-600">Today&apos;s focus completed! 🎉</div>
                <div className="mt-2 rounded-r-xl border-l-4 border-purple-600 bg-purple-50 p-4 text-gray-900">
                  {todayLog.focus_task}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Current streak: <span className="font-semibold text-purple-600">{streakCount}</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-r-xl border-l-4 border-purple-600 bg-purple-50 p-4 text-gray-900">
                {todayLog.focus_task}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="rounded-xl bg-green-500 px-6 py-3 font-semibold text-white transition-all duration-200 hover:bg-green-600 disabled:opacity-60"
                  onClick={() => handleSetCompleted(true)}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Saving..." : "Yes I did it!"}
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-red-100 px-6 py-3 font-semibold text-red-600 transition-all duration-200 hover:bg-red-200 disabled:opacity-60"
                  onClick={() => handleSetCompleted(false)}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Saving..." : "Not today"}
                </button>
              </div>
            </div>
          )}

          {actionMessage ? (
            <div className="mt-4 text-sm text-gray-500">{actionMessage}</div>
          ) : null}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-gray-900">Streak Calendar</h2>
            <div className="text-sm text-gray-500">
              {monthName} {year}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-400 uppercase">
            {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2">
            {Array.from({ length: startWeekday }).map((_, idx) => (
              <div key={`pad-${idx}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(year, month, day);
              const key = toISODate(date);
              const isToday = key === todayKey;
              const isFuture = date.getTime() > new Date(year, month, today.getDate()).getTime();
              const entry = logsByDate.get(key);
              const completed = Boolean(entry?.completed);

              let cellClass = "text-gray-500";
              let showDot = false;

              if (isFuture) {
                cellClass = "text-gray-300";
              } else if (isToday) {
                cellClass = "bg-purple-600 text-white font-bold";
              } else if (entry) {
                if (completed) {
                  cellClass = "bg-green-100 text-green-700 font-medium";
                  showDot = true;
                } else {
                  cellClass = "bg-red-100 text-red-400";
                }
              }

              return (
                <div key={key} className="text-center">
                  <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full ${cellClass}`}>
                    {day}
                  </div>
                  {showDot ? (
                    <div className="mx-auto mt-1 h-1.5 w-1.5 rounded-full bg-green-500" />
                  ) : (
                    <div className="mt-1 h-1.5" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div className="text-sm text-gray-500">Current Streak 🔥</div>
            <div className="text-2xl font-bold text-purple-600">{streakCount}</div>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-sm text-gray-500">Longest Streak</div>
            <div className="text-lg font-bold text-purple-600">{longestStreak}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
