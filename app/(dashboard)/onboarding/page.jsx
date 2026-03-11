"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import createClient from "@/lib/supabase/client";

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

function toISODate(date) {
  return date.toISOString().slice(0, 10);
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

  const minDeadline = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return toISODate(tomorrow);
  }, []);

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

      const startDate = toISODate(new Date());

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
      <main className="flex min-h-screen items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-base-100 px-4 py-12">
      <div className="mx-auto w-full max-w-[600px]">
        <div className="mb-6">
          <ul className="steps w-full">
            <li className={`step ${step >= 1 ? "step-primary" : ""}`}>Step 1</li>
            <li className={`step ${step >= 2 ? "step-primary" : ""}`}>Step 2</li>
            <li className={`step ${step >= 3 ? "step-primary" : ""}`}>Step 3</li>
          </ul>
        </div>

        <div className="card border border-base-200 bg-base-100 shadow-sm">
          <div className="card-body">
            <div
              key={step}
              className={`animate-in duration-300 ${
                transitionDir === "back"
                  ? "fade-in slide-in-from-left-2"
                  : "fade-in slide-in-from-right-2"
              }`}
            >
              {stepContent}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={goBack}
                disabled={step === 1 || loading}
              >
                Back
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePrimary}
                disabled={primaryDisabled}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Saving...
                  </>
                ) : step === 3 ? (
                  "Let's Begin"
                ) : (
                  "Continue"
                )}
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="alert alert-error mt-6">
            <span>{error}</span>
          </div>
        ) : null}
      </div>
    </main>
  );
}
