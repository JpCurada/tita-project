"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorMessage } from "@/lib/format";

export default function SignInPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    formData.set("flow", flow);
    // Emails are stored lower-cased so a profile pre-created by the chair
    // matches regardless of how it is typed at sign-up.
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    formData.set("email", email);

    try {
      await signIn("password", formData);
      router.push("/dashboard");
    } catch (caught) {
      setError(
        flow === "signIn"
          ? "Incorrect email or password."
          : errorMessage(caught),
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <header className="mb-8 text-center">
          <p className="text-xs uppercase tracking-widest text-ink-muted">
            PIT – Faculty Association
          </p>
          <h1 className="mt-2 font-serif text-2xl font-semibold">
            Loan Application System
          </h1>
        </header>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              placeholder="you@pit.edu.ph"
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={
                flow === "signIn" ? "current-password" : "new-password"
              }
              required
              minLength={8}
              className="input"
            />
            {flow === "signUp" && (
              <p className="mt-1.5 text-xs text-ink-muted">
                At least 8 characters.
              </p>
            )}
          </div>

          {error !== null && (
            <p
              role="alert"
              className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting
              ? "Please wait…"
              : flow === "signIn"
                ? "Sign in"
                : "Create account"}
          </button>

          <p className="text-center text-sm text-ink-muted">
            {flow === "signIn" ? "No account yet?" : "Already registered?"}{" "}
            <button
              type="button"
              className="font-medium text-ink underline underline-offset-2"
              onClick={() => {
                setFlow(flow === "signIn" ? "signUp" : "signIn");
                setError(null);
              }}
            >
              {flow === "signIn" ? "Create one" : "Sign in"}
            </button>
          </p>
        </form>
      </div>
    </main>
  );
}
