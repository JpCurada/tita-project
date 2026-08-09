"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "@/components/PasswordField";
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
    formData.set(
      "email",
      String(formData.get("email") ?? "").trim().toLowerCase(),
    );

    try {
      await signIn("password", formData);
      router.push("/dashboard");
    } catch (caught) {
      setError(
        flow === "signIn" ? "That email and password do not match." : errorMessage(caught),
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-5xl items-center gap-12 px-5 py-12 lg:grid-cols-[1.05fr_minmax(0,380px)]">
      {/* Thesis: the form this replaces, quoted in its own words. */}
      <section className="hidden lg:block">
        <span className="eyebrow">Republic of the Philippines</span>
        <h1 className="page-title mt-3 text-[2.5rem] leading-[1.1]">
          Palompon Institute of Technology
          <span className="mt-1 block font-normal italic text-ink-pencil">
            Faculty Association
          </span>
        </h1>

        <hr className="my-8 border-rule-strong" />

        <p className="max-w-md font-display text-[1.0625rem] leading-relaxed text-ink-pencil">
          <span className="text-ink">
            “I hereby apply for a REGULAR/EMERGENCY loan
          </span>{" "}
          in the amount of{" "}
          <span className="tnum border-b border-rule-strong px-1 font-mono text-[0.9375rem] text-ink">
            PHP 12,000.00
          </span>{" "}
          payable within five (5) months to be deducted every quincena in the
          amount of{" "}
          <span className="tnum border-b border-rule-strong px-1 font-mono text-[0.9375rem] text-ink">
            PHP 1,200.00
          </span>
          .”
        </p>

        <dl className="mt-10 grid max-w-md grid-cols-3 gap-px border border-rule bg-rule">
          {[
            ["Filed", "Queue number issued at once"],
            ["Reviewed", "Two members, then the chair"],
            ["Released", "Recorded and archived"],
          ].map(([term, detail]) => (
            <div key={term} className="bg-leaf px-3 py-3">
              <dt className="eyebrow text-viridian">{term}</dt>
              <dd className="mt-1.5 text-xs leading-snug text-ink-pencil">
                {detail}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="w-full">
        <div className="leaf p-7">
          <span className="eyebrow">
            {flow === "signIn" ? "Members and committee" : "New account"}
          </span>
          <h2 className="section-title mt-1.5">
            {flow === "signIn" ? "Sign in" : "Create your account"}
          </h2>

          <form onSubmit={handleSubmit} className="mt-7 space-y-6">
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

            <PasswordField
              // Remount on flow change so the field clears and the reveal
              // toggle resets between signing in and creating an account.
              key={flow}
              autoComplete={
                flow === "signIn" ? "current-password" : "new-password"
              }
              minLength={8}
              hint={
                flow === "signUp"
                  ? "At least 8 characters. Use the email address the chair registered for you."
                  : undefined
              }
            />

            {error !== null && (
              <p
                role="alert"
                className="border-l-2 border-oxide bg-oxide-wash px-3 py-2 text-sm text-oxide"
              >
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting
                ? "Working"
                : flow === "signIn"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-ink-pencil">
          {flow === "signIn" ? "No account yet?" : "Already registered?"}{" "}
          <button
            type="button"
            className="btn-quiet"
            onClick={() => {
              setFlow(flow === "signIn" ? "signUp" : "signIn");
              setError(null);
            }}
          >
            {flow === "signIn" ? "Create one" : "Sign in"}
          </button>
        </p>
      </section>
    </main>
  );
}
