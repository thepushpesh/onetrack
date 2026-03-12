"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import createClient from "@/lib/supabase/client";
import CalendarPicker from "@/components/ui/CalendarPicker";

export const dynamic = "force-dynamic";

const PRESET_DISTRACTIONS = [
  "Instagram",
  "YouTube",
  "Facebook",
  "Twitter",
  "Netflix",
  "Gaming",
  "Overthinking",
  "Procrastination",
  "Phone",
  "WhatsApp",
  "Porn",
  "News",
];

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseISODateLocal(value) {
  const [y, m, d] = String(value).split("-").map((n) => Number(n));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function normalizeChip(label) {
  return label.trim().replace(/\s+/g, " ");
}

export default function OnboardingPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(1);
  const [transitionDir, setTransitionDir] = useState("next");

  const [goalText, setGoalText] = useState("");
  const [deadline, setDeadline] = useState("");
  const [distractions, setDistractions] = useState([]);
  const [customDistraction, setCustomDistraction] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

        const { data: existingGoal, error: goalError } = await supabase
          .from("goals")
          .select("*")
          .eq("user_id", user.id)
          .limit(1);

        if (goalError) throw goalError;

        if (existingGoal && existingGoal.length > 0) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        router.replace("/login");
        return;
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const minDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }, []);

  const minDeadline = useMemo(() => toDateKey(minDate), [minDate]);

  const selectedDeadlineDate = useMemo(() => {
    if (!deadline) return null;
    return parseISODateLocal(deadline);
  }, [deadline]);

  const canContinueStep1 = goalText.trim().length >= 10;
  const canContinueStep2 = Boolean(deadline) && deadline >= minDeadline;
  const canContinueStep3 = distractions.length > 0;

  const goNext = () => {
    setError("");
    setTransitionDir("next");
    setStep((s) => Math.min(3, s + 1));
  };

  const goBack = () => {
    setError("");
    setTransitionDir("back");
    setStep((s) => Math.max(1, s - 1));
  };

  const toggleDistraction = (label) => {
    const normalized = normalizeChip(label);
    setDistractions((current) => {
      const exists = current.some(
        (d) => d.toLowerCase() === normalized.toLowerCase()
      );
      if (exists) {
        return current.filter((d) => d.toLowerCase() !== normalized.toLowerCase());
      }
      return [...current, normalized];
    });
  };

  const addCustomDistraction = () => {
    const normalized = normalizeChip(customDistraction);
    if (!normalized) return;
    toggleDistraction(normalized);
    setCustomDistraction("");
  };

  const handlePrimary = async () => {
    setError("");

    if (step === 1) {
      if (!canContinueStep1) {
        setError("Goal must be at least 10 characters.");
        return;
      }
      goNext();
      return;
    }

    if (step === 2) {
      if (!deadline) {
        setError("Please pick a deadline.");
        return;
      }
      if (!canContinueStep2) {
        setError("Deadline must be at least tomorrow.");
        return;
      }
      goNext();
      return;
    }

    if (!canContinueStep3) {
      setError("Pick at least one distraction to continue.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!data?.user) {
        router.push("/login");
        return;
      }

      // Store as a DATE (YYYY-MM-DD) in the user's local calendar day.
      const startDate = toDateKey(new Date());

      const { error: insertError } = await supabase.from("goals").insert({
        user_id: data.user.id,
        goal_text: goalText.trim(),
        deadline,
        distractions,
        start_date: startDate,
      });

      if (insertError) throw insertError;

      router.push("/dashboard");
    } catch (e) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const stepContent = (() => {
    if (step === 1) {
      return (
        <>
          <h1 className="text-3xl font-semibold">What do you want to achieve?</h1>
          <p className="mt-2 text-base text-base-content/70">
            Be specific. Vague goals get vague results.
          </p>

          <label className="form-control mt-6 w-full">
            <textarea
              className="textarea textarea-bordered min-h-40 w-full text-base"
              placeholder="e.g. Launch my SaaS app in 60 days"
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
            />
            <div className="mt-2 flex items-center justify-between text-sm text-base-content/60">
              <span>Minimum 10 characters</span>
              <span>{goalText.trim().length}/10</span>
            </div>
          </label>
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <h1 className="text-3xl font-semibold">When is your deadline?</h1>
          <p className="mt-2 text-base text-base-content/70">
            A goal without a deadline is just a wish.
          </p>

          <label className="form-control mt-6 w-full">
            <span className="label-text mb-2 block">Choose a date</span>
            <input
              type="date"
              className="input input-bordered w-full"
              value={deadline}
              min={minDeadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            <p className="mt-2 text-sm text-base-content/60">
              Earliest allowed: {minDeadline}
            </p>
          </label>
        </>
      );
    }

    return (
      <>
        <h1 className="text-3xl font-semibold">What pulls you off track?</h1>
        <p className="mt-2 text-base text-base-content/70">
          Name your enemies. Then we&apos;ll face them together.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PRESET_DISTRACTIONS.map((label) => {
            const selected = distractions.some(
              (d) => d.toLowerCase() === label.toLowerCase()
            );
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleDistraction(label)}
                className={`badge badge-lg justify-center py-4 ${
                  selected ? "badge-primary" : "badge-outline"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {distractions.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {distractions.map((d) => (
              <button
                key={d}
                type="button"
                className="badge badge-primary badge-lg"
                onClick={() => toggleDistraction(d)}
                title="Click to remove"
              >
                {d} <span className="ml-1 opacity-80">×</span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-6">
          <p className="mb-2 text-sm text-base-content/70">
            Anything else? Add your own
          </p>
          <div className="join w-full">
            <input
              className="input input-bordered join-item w-full"
              value={customDistraction}
              onChange={(e) => setCustomDistraction(e.target.value)}
              placeholder="e.g. Late-night scrolling"
            />
            <button
              type="button"
              className="btn btn-outline join-item"
              onClick={addCustomDistraction}
              disabled={!customDistraction.trim()}
            >
              Add
            </button>
          </div>
          <p className="mt-2 text-sm text-base-content/60">
            Select at least one distraction to continue.
          </p>
        </div>
      </>
    );
  })();

  const primaryDisabled =
    loading ||
    (step === 1 && !canContinueStep1) ||
    (step === 2 && !canContinueStep2) ||
    (step === 3 && !canContinueStep3);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f5f3ff] to-[#ede9fe]">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f5f3ff] to-[#ede9fe] px-4 pt-8 pb-12">
      <div className="mx-auto w-full max-w-[560px]">
        <div className="relative isolate mb-8 flex items-center justify-between px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[calc(10%+20px)] right-[calc(10%+20px)] top-5 z-0 h-[2px] rounded-full bg-gray-200"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[calc(10%+20px)] right-[calc(10%+20px)] top-5 z-0 h-[2px] origin-left rounded-full bg-purple-600"
            style={{ transform: `scaleX(${(step - 1) / 2})` }}
          />

          {[1, 2, 3].map((n) => {
            const completed = step > n;
            const active = step === n;
            const circleCls =
              completed || active
                ? "bg-purple-600 text-white"
                : "bg-gray-200 text-gray-500";
            const labelCls =
              completed || active ? "text-purple-700" : "text-gray-400";

            return (
              <div key={n} className="relative z-10 flex flex-col items-center">
                <div
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm ${circleCls}`}
                >
                  {n}
                </div>
                <div className={`mt-2 text-sm font-medium ${labelCls}`}>Step {n}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          <div
            key={step}
              className={`animate-in duration-300 ${
                transitionDir === "back"
                  ? "fade-in slide-in-from-left-2"
                  : "fade-in slide-in-from-right-2"
              }`}
            >
              {step === 1 ? (
                <>
                  <h1 className="text-3xl font-semibold text-gray-900">What do you want to achieve?</h1>
                  <p className="mt-2 text-base text-gray-500">
                    Be specific. Vague goals get vague results.
                  </p>

                  <div className="mt-6">
                    <textarea
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                      style={{ minHeight: 120 }}
                      placeholder="e.g. Launch my SaaS app in 60 days"
                      value={goalText}
                      onChange={(e) => setGoalText(e.target.value)}
                    />
                    <div className="mt-1 text-right text-xs text-gray-400">
                      {goalText.trim().length}/10
                    </div>
                  </div>
                </>
              ) : step === 2 ? (
                <>
                  <h1 className="text-3xl font-semibold text-gray-900">When is your deadline?</h1>
                  <p className="mt-2 text-base text-gray-500">
                    A goal without a deadline is just a wish.
                  </p>

                  <div className="mt-6">
                    <CalendarPicker
                      selectedDate={selectedDeadlineDate}
                      minDate={minDate}
                      onDateSelect={(date) => setDeadline(toDateKey(date))}
                    />
                    <p className="mt-3 text-sm text-gray-400">Earliest allowed: {minDeadline}</p>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-semibold text-gray-900">What pulls you off track?</h1>
                  <p className="mt-2 text-base text-gray-500">
                    Name your enemies. Then we&apos;ll face them together.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {PRESET_DISTRACTIONS.map((label) => {
                      const selected = distractions.some(
                        (d) => d.toLowerCase() === label.toLowerCase()
                      );
                      const cls = selected
                        ? "bg-purple-600 text-white border-purple-600 text-sm font-medium"
                        : "bg-white text-gray-600 border-gray-200 text-sm";
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => toggleDistraction(label)}
                          className={`cursor-pointer rounded-full border px-4 py-2 transition-colors hover:border-purple-400 ${cls}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {distractions.length ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {distractions.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDistraction(d)}
                          className="flex items-center gap-2 rounded-full border border-purple-200 bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700"
                          title="Remove"
                        >
                          {d} <span className="text-purple-600">×</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-6">
                    <p className="mb-2 text-sm text-gray-500">Anything else? Add your own</p>
                    <div className="flex gap-2">
                      <input
                        className="h-11 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={customDistraction}
                        onChange={(e) => setCustomDistraction(e.target.value)}
                        placeholder="e.g. Late-night scrolling"
                      />
                      <button
                        type="button"
                        className="rounded-xl border border-purple-600 px-6 py-3 font-semibold text-purple-600 transition-all duration-200 hover:bg-purple-50 disabled:opacity-60"
                        onClick={addCustomDistraction}
                        disabled={!customDistraction.trim()}
                      >
                        Add
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-gray-400">Select at least one distraction to continue.</p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                className="rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-600 transition-all duration-200 hover:bg-gray-50 disabled:opacity-60"
                onClick={goBack}
                disabled={step === 1 || loading}
              >
                Back
              </button>

              <button
                type="button"
                className="rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:bg-purple-700 disabled:opacity-60"
                onClick={handlePrimary}
                disabled={primaryDisabled}
              >
                {loading ? "Saving..." : step === 3 ? "Let's Begin" : "Continue"}
              </button>
            </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
