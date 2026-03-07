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
    <div className="min-h-screen bg-base-100 text-base-content">
      <header className="border-b border-base-200">
        <div className="navbar mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex-1">
            <Link href="/" className="text-xl font-bold tracking-tight">
              OneTrack
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn btn-ghost btn-sm sm:btn-md">
              Login
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm sm:btn-md">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Stop jumping between ideas. Start finishing what matters.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-base-content/75">
            OneTrack helps you lock in on one goal, track your daily progress
            and build the streak that changes your life.
          </p>
          <div className="mt-10">
            <Link href="/signup" className="btn btn-primary btn-lg px-8">
              Start For Free
            </Link>
            <p className="mt-3 text-sm text-base-content/60">
              No credit card required. Free forever.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-center text-3xl font-semibold">Sound familiar?</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {painPoints.map((item) => (
              <div key={item.text} className="card border border-base-200 bg-base-100 shadow-sm">
                <div className="card-body">
                  <div className="text-3xl">{item.emoji}</div>
                  <p className="text-base leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-center text-3xl font-semibold">How OneTrack works</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="card border border-base-200 bg-base-100 shadow-sm">
                <div className="card-body">
                  <div className="flex items-center gap-3">
                    <div className="badge badge-primary badge-lg">{step.number}</div>
                    <span className="text-2xl" aria-hidden="true">
                      {step.icon}
                    </span>
                  </div>
                  <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
                  <p className="text-base-content/75">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl font-semibold">Your goal is waiting. Start today.</h2>
          <div className="mt-6">
            <Link href="/signup" className="btn btn-primary btn-lg px-8">
              Get Started Free
            </Link>
          </div>
        </section>
      </main>

      <footer className="footer footer-center border-t border-base-200 px-4 py-8 text-base-content/70">
        <p>OneTrack © 2024</p>
      </footer>
    </div>
  );
}
