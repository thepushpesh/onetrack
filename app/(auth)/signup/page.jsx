"use client";

import Link from "next/link";
import { useState } from "react";
import createClient from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleEmailSignup = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setSuccess("Account created. Check your email for the verification link.");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleGoogleSignup = async () => {
    setError("");
    setSuccess("");
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
            <h1 className="mt-3 text-2xl font-semibold">Create your account</h1>
            <p className="mt-1 text-sm text-base-content/70">
              Start your focus journey today
            </p>
          </div>

          <button
            type="button"
            className="btn btn-outline w-full"
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            Continue with Google
          </button>

          <div className="divider">or</div>

          <form className="space-y-4" onSubmit={handleEmailSignup}>
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

            <label className="form-control w-full">
              <span className="label-text mb-1 block">Confirm password</span>
              <input
                type="password"
                className="input input-bordered w-full"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>

            <button
              type="submit"
              className={`btn btn-primary w-full ${loading ? "btn-disabled" : ""}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {error ? (
            <div className="alert alert-error mt-4">
              <span>{error}</span>
            </div>
          ) : null}

          {success ? (
            <div className="alert alert-success mt-4">
              <span>{success}</span>
            </div>
          ) : null}

          <p className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="link link-primary font-medium">
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
