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
        console.log(response, "quote response");
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
      <main className="flex min-h-screen items-center justify-center bg-base-100">
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

  const { year, month, daysInMonth, startWeekday } = getMonthMeta(today);
  const monthName = today.toLocaleString(undefined, { month: "long" });

  return (
    <main className="min-h-screen bg-base-100">
      <header className="border-b border-base-200">
        <div className="navbar mx-auto w-full max-w-[480px] px-4">
          <div className="flex-1">
            <span className="text-lg font-bold">OneTrack</span>
          </div>
          <div className="flex-none">
            <span className="text-sm text-base-content/70">My Goal</span>
          </div>
          <div className="flex-1 justify-end">
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[480px] space-y-5 px-4 py-6">
        {error ? (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        ) : null}

        <section className="card border border-base-200 bg-base-100 shadow-sm">
          <div className="card-body">
            <div className="text-center">
              {deadlinePassed ? (
                <>
                  <div className="text-3xl font-semibold">Goal deadline reached</div>
                  <div className="mt-1 text-sm text-base-content/70">
                    Your deadline was {goal.deadline}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-6xl font-extrabold leading-none">
                    {typeof daysRemaining === "number" ? daysRemaining : "—"}
                  </div>
                  <div className="mt-1 text-sm text-base-content/70">days remaining</div>
                </>
              )}
            </div>

            <div className="mt-4 card bg-base-200/40">
              <div className="card-body p-4">
                <div className="text-xs uppercase tracking-wide text-base-content/60">
                  Your goal
                </div>
                <div className="mt-1 text-base">{goal.goal_text}</div>
                {goal.deadline ? (
                  <div className="mt-2 text-sm text-base-content/70">
                    Deadline: <span className="font-medium">{goal.deadline}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="card border border-base-200 bg-base-100 shadow-sm">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Daily quote</h2>
              <span className="text-xs text-base-content/50">ZenQuotes</span>
            </div>

            <div className="mt-3 text-sm text-base-content/80">
              {quoteError ? (
                <p>
                  The secret of getting ahead is getting started.{" "}
                  <span className="text-base-content/60">— Mark Twain</span>
                </p>
              ) : quote ? (
                <p>
                  {quote.text}{" "}
                  <span className="text-base-content/60">— {quote.author}</span>
                </p>
              ) : (
                <div className="flex items-center gap-2 text-base-content/60">
                  <span className="loading loading-dots loading-sm" />
                  Loading quote...
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="card border border-base-200 bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="text-lg font-semibold">What&apos;s your one thing today?</h2>

            {!todayLog ? (
              <>
                <textarea
                  className="textarea textarea-bordered mt-3 min-h-28 w-full"
                  placeholder="Write your one focus task for today..."
                  value={focusInput}
                  onChange={(e) => setFocusInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary mt-4 w-full"
                  onClick={handleSetFocus}
                  disabled={actionLoading || !focusInput.trim()}
                >
                  {actionLoading ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      Saving...
                    </>
                  ) : (
                    "Set Today's Focus"
                  )}
                </button>
              </>
            ) : todayLog.completed ? (
              <div className="mt-4 space-y-3">
                <div className="alert alert-success">
                  <span>Today&apos;s focus completed! 🎉</span>
                </div>
                <div className="card bg-base-200/40">
                  <div className="card-body p-4">
                    <div className="text-xs uppercase tracking-wide text-base-content/60">
                      Today&apos;s task
                    </div>
                    <div className="mt-1 text-base">{todayLog.focus_task}</div>
                  </div>
                </div>
                <div className="text-sm text-base-content/70">
                  Current streak: <span className="font-semibold">{streakCount}</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="card bg-base-200/40">
                  <div className="card-body p-4">
                    <div className="text-xs uppercase tracking-wide text-base-content/60">
                      Today&apos;s task
                    </div>
                    <div className="mt-1 text-base">{todayLog.focus_task}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => handleSetCompleted(true)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : null}
                    Yes, I did it!
                  </button>
                  <button
                    type="button"
                    className="btn btn-error btn-outline"
                    onClick={() => handleSetCompleted(false)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : null}
                    Not today
                  </button>
                </div>
              </div>
            )}

            {actionMessage ? (
              <div className="mt-4 text-sm text-base-content/70">{actionMessage}</div>
            ) : null}
          </div>
        </section>

        <section className="card border border-base-200 bg-base-100 shadow-sm">
          <div className="card-body">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Streak calendar</h2>
              <div className="text-sm text-base-content/70">
                {monthName} {year}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs">
              {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                <div key={d} className="text-base-content/50">
                  {d}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-2">
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

                let cls = "bg-base-200/40 text-base-content/60";
                let icon = "";
                if (isFuture) {
                  cls = "bg-base-200/20 text-base-content/30";
                } else if (entry) {
                  if (completed) {
                    cls = "bg-success/20 text-success-content";
                    icon = "✅";
                  } else {
                    cls = "bg-error/15 text-error-content";
                    icon = "❌";
                  }
                }

                return (
                  <div
                    key={key}
                    className={`aspect-square rounded-lg p-1 flex items-center justify-center ${cls} ${
                      isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-base-100" : ""
                    }`}
                    title={key}
                  >
                    <div className="flex flex-col items-center justify-center leading-none">
                      <div className="text-[11px]">{day}</div>
                      {icon ? <div className="mt-1 text-sm">{icon}</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-sm text-base-content/70">
              Current streak: <span className="font-semibold">{streakCount}</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
