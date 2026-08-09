"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { Spinner } from "@/components/Spinner";
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
        flow === "signIn"
          ? "That email and password do not match. Check for typos, or create an account if you have not made one yet."
          : errorMessage(caught),
      );
      setSubmitting(false);
    }
  }

  return (
    /* Signing in is the only job on this page, so the form sits in the centre
       of the optical field rather than off to one side. Supporting context goes
       below it, where it reassures without competing for attention. */
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <div className="rise">
        <header className="text-center">
          <Image
            src="/pit-logo.png"
            alt=""
            width={60}
            height={60}
            className="mx-auto"
            priority
          />
          <h1 className="page-title mt-4">PIT Faculty Association</h1>
          <p className="mt-1.5 text-sm text-ink-pencil">
            Loan Committee · Palompon, Leyte
          </p>
        </header>

        <div className="leaf mt-8 p-6 sm:p-7">
          <h2 className="section-title">
            {flow === "signIn" ? "Sign in" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-ink-pencil">
            {flow === "signIn"
              ? "Use the email address registered with the association."
              : "Use the email address the chair registered for you."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
                autoFocus
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
              hint={flow === "signUp" ? "At least 8 characters." : undefined}
            />

            {error !== null && (
              <p
                role="alert"
                className="rise rounded-md border-l-2 border-oxide bg-oxide-wash px-3 py-2.5 text-sm leading-relaxed text-oxide"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3"
            >
              {submitting && <Spinner />}
              {submitting
                ? "Signing in"
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

        {/* What happens after signing in. Reassurance, not decoration. */}
        <ol className="stagger mt-9 space-y-2.5 border-t border-rule pt-6">
          {[
            ["File", "Your loan number is issued the moment you apply."],
            ["Review", "Two committee members decide, then the chair."],
            ["Release", "The treasurer records it and files your form."],
          ].map(([term, detail]) => (
            <li key={term} className="flex gap-3 text-sm">
              <span
                className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-viridian"
                aria-hidden="true"
              />
              <span>
                <span className="font-medium">{term}.</span>{" "}
                <span className="text-ink-pencil">{detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
