import Link from "next/link";

const painPoints = [
  {
    emoji: "🚧",
    text: "You start something new every week but finish nothing",
  },
  {
    emoji: "📱",
    text: "Instagram, YouTube and overthinking steal your hours",
  },
  {
    emoji: "🧭",
    text: "You have the goal but no system to actually stick to it",
  },
];

const steps = [
  {
    number: 1,
    icon: "🎯",
    title: "Set your one goal",
    description: "Write down what you want to achieve and your deadline",
  },
  {
    number: 2,
    icon: "✅",
    title: "Show up daily",
    description: "Log your one focus task every morning",
  },
  {
    number: 3,
    icon: "🔥",
    title: "Build your streak",
    description: "Watch your calendar fill up and never break the chain",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-purple-700">
            OneTrack
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 font-medium text-gray-600 transition-all hover:bg-purple-50 hover:text-purple-600"
            >
              Login
            </Link>
            {/* <Link
              href="/signup"
              className="rounded-xl bg-purple-600 px-5 py-2 font-semibold text-white shadow-sm transition-all hover:bg-purple-700"
            >
              Get Started
            </Link> */}
          </div>
        </div>
      </header>

      <main>
        <section className="bg-white pb-16 pt-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <span className="mb-4 inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
              🎯 Free forever. No credit card.
            </span>
            <h1 className="mx-auto max-w-2xl text-4xl font-black leading-tight text-gray-900 md:text-5xl">
              Stop jumping between ideas. Start finishing what matters.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
              OneTrack helps you lock in on one goal, track your daily progress and build the
              streak that changes your life.
            </p>
            <div className="mt-8">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-2xl bg-purple-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-purple-700 hover:shadow-xl"
              >
                Start For Free
              </Link>
              <p className="mt-3 text-sm text-gray-400">
                No credit card required. Free forever.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-purple-50 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
              Sound familiar?
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {painPoints.map((item, index) => {
                const title =
                  index === 0
                    ? "Nothing ever gets done"
                    : index === 1
                      ? "Hours disappear daily"
                      : "Stuck in planning mode";
                return (
                  <div
                    key={item.text}
                    className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="mb-4 text-4xl">{item.emoji}</div>
                    <div className="mb-2 text-base font-bold text-gray-900">{title}</div>
                    <p className="text-sm text-gray-500">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
              How OneTrack works
            </h2>
            <div className="grid items-center gap-6 md:grid-cols-3">
              {steps.map((step, idx) => (
                <div key={step.number} className="text-center p-6">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-lg font-black text-white">
                    {step.number}
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-gray-900">{step.title}</h3>
                  <p className="text-sm text-gray-500">{step.description}</p>
                  {idx < steps.length - 1 ? (
                    <div className="mt-6 hidden text-2xl text-gray-300 md:block">→</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-br from-purple-600 to-purple-800 py-16">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold text-white">
              Your goal is waiting. Start today.
            </h2>
            <p className="mt-2 text-center text-purple-200">
              Commit to one outcome and keep the streak alive.
            </p>
            <div className="mt-8">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 font-bold text-purple-700 shadow-lg transition-all hover:bg-purple-50"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 py-8">
        <p className="text-center text-sm text-gray-400">OneTrack © 2026</p>
      </footer>
    </div>
  );
}
