"use client";

import Link from "next/link";
import { useState } from "react";
import createClient from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    window.location.href = "/dashboard";
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md border border-base-200 bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="mb-6 text-center">
            <p className="text-2xl font-bold">OneTrack</p>
            <h1 className="mt-3 text-2xl font-semibold">Welcome back</h1>
            <p className="mt-1 text-sm text-base-content/70">
              Log in to continue your focus streak
            </p>
          </div>

          <button
            type="button"
            className="btn btn-outline w-full"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            Continue with Google
          </button>

          <div className="divider">or</div>

          <form className="space-y-4" onSubmit={handleEmailLogin}>
            <label className="form-control w-full">
              <span className="label-text mb-1 block">Email</span>
              <input
                type="email"
                className="input input-bordered w-full"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="form-control w-full">
              <span className="label-text mb-1 block">Password</span>
              <div className="join w-full">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input input-bordered join-item w-full"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline join-item"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>

          {error ? (
            <div className="alert alert-error mt-4">
              <span>{error}</span>
            </div>
          ) : null}

          <p className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="link link-primary font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
