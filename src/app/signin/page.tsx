"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { SiteFooter } from "@/components/SiteFooter";
import { Spinner } from "@/components/Spinner";
import { errorMessage } from "@/lib/format";

type Flow = "signIn" | "signUp" | "forgot" | "code" | "reset";

export default function SignInPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();

  const [flow, setFlow] = useState<Flow>("signIn");
  const [email, setEmail] = useState("");
  // The code is held here between the two reset steps, so the member types it
  // once even if the new password is rejected and they have to try again.
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function go(next: Flow) {
    setFlow(next);
    setError(null);
    setNotice(null);
  }

  /**
   * Step one of the reset. The code is only checked for shape here — Convex
   * Auth verifies and consumes it in the same call that sets the password, and
   * a separate "is this code right?" endpoint would let anyone guess codes
   * without limit. A wrong code surfaces on the final step and sends the
   * member back here with what they typed still in place.
   */
  function handleCodeStep(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entered = String(
      new FormData(event.currentTarget).get("code") ?? "",
    ).replace(/\s/g, "");

    if (!/^\d{8}$/.test(entered)) {
      setError("That code should be the eight digits from your email.");
      return;
    }
    setCode(entered);
    go("reset");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const form = new FormData(event.currentTarget);
    const address = String(form.get("email") ?? email).trim().toLowerCase();
    form.set("email", address);

    if (flow === "reset") {
      const next = String(form.get("newPassword") ?? "");
      if (next !== String(form.get("confirmPassword") ?? "")) {
        setError("The two passwords do not match.");
        return;
      }
      form.delete("confirmPassword");
      form.set("code", code);
    }

    setSubmitting(true);
    try {
      if (flow === "forgot") {
        form.set("flow", "reset");
        await signIn("password", form);
        setEmail(address);
        setCode("");
        setFlow("code");
        setNotice(`We sent a code to ${address}. It is good for one hour.`);
      } else if (flow === "reset") {
        form.set("flow", "reset-verification");
        await signIn("password", form);
        router.push("/dashboard");
        return;
      } else {
        form.set("flow", flow);
        await signIn("password", form);
        router.push("/dashboard");
        return;
      }
    } catch (caught) {
      if (flow === "reset") {
        // The only thing the server can reject at this point is the code.
        setFlow("code");
        setError("That code is wrong or has expired. Check it and try again.");
      } else {
        setError(messageFor(flow, caught));
      }
    }
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Left: what this is. Fills its half rather than floating in a column. */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-ink px-12 py-14 text-leaf lg:flex">
        <div className="relative">
          <Image src="/pit-logo.png" alt="" width={64} height={64} priority />
          <p className="eyebrow mt-7 text-leaf/55">
            Palompon Institute of Technology
          </p>
          <h1 className="mt-3 font-display text-[2.75rem] font-semibold leading-[1.08]">
            Faculty Association
            <span className="mt-1 block text-leaf/60">Loan Committee</span>
          </h1>
        </div>

        <div className="relative">
          <p className="max-w-md text-[0.9375rem] leading-relaxed text-leaf/70">
            Every application is filed, numbered, and decided in one place —
            with a record of who decided what, and when.
          </p>

          <ol className="mt-9 max-w-md space-y-5 border-t border-leaf/15 pt-8">
            {[
              ["File", "Your loan number is issued the moment you apply."],
              ["Review", "Two committee members decide, then the chair."],
              ["Release", "The treasurer records it and files your form."],
            ].map(([term, detail], index) => (
              <li key={term} className="flex gap-4">
                <span className="tnum shrink-0 font-mono text-sm text-leaf/40">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{term}</span>
                  <span className="mt-0.5 block text-sm text-leaf/60">
                    {detail}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <p className="relative text-xs text-leaf/35">Palompon, Leyte</p>
      </section>

      {/* Right: the form. */}
      <section className="flex min-h-screen flex-col px-5 sm:px-10 lg:px-14">
        <div className="rise mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          {/* The mark only appears here on small screens, where the left
              panel is not shown. */}
          <div className="mb-8 text-center lg:hidden">
            <Image
              src="/pit-logo.png"
              alt=""
              width={52}
              height={52}
              className="mx-auto"
              priority
            />
            <p className="mt-3 font-display text-lg font-semibold">
              PIT Faculty Association
            </p>
            <p className="text-sm text-ink-pencil">Loan Committee</p>
          </div>

          <h2 className="page-title">{HEADINGS[flow].title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-pencil">
            {HEADINGS[flow].blurb}
          </p>

          <form
            onSubmit={flow === "code" ? handleCodeStep : handleSubmit}
            className="mt-7 space-y-5"
          >
            {flow === "code" ? (
              <div>
                <label className="label" htmlFor="code">
                  Code from your email
                </label>
                <input
                  id="code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  required
                  autoFocus
                  defaultValue={code}
                  placeholder="00000000"
                  className="input tnum text-center font-mono text-xl tracking-[0.35em]"
                />
                <p className="mt-2.5 text-xs text-ink-faint">
                  Eight digits, sent to {email}.
                </p>
              </div>
            ) : flow === "reset" ? (
              <>
                <input type="hidden" name="email" value={email} />
                <PasswordField
                  label="New password"
                  name="newPassword"
                  autoComplete="new-password"
                  minLength={8}
                  hint="At least 8 characters."
                />
                <PasswordField
                  label="Confirm new password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  minLength={8}
                />
              </>
            ) : (
              <>
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
                    defaultValue={email}
                    className="input"
                    placeholder="you@pit.edu.ph"
                  />
                </div>

                {flow !== "forgot" && (
                  <div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="label mb-0">Password</span>
                      {flow === "signIn" && (
                        <button
                          type="button"
                          className="btn-quiet text-xs"
                          onClick={() => go("forgot")}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <PasswordField
                      key={flow}
                      label={null}
                      autoComplete={
                        flow === "signIn" ? "current-password" : "new-password"
                      }
                      minLength={8}
                      hint={
                        flow === "signUp" ? "At least 8 characters." : undefined
                      }
                    />
                  </div>
                )}
              </>
            )}

            {notice !== null && (
              <p className="rise rounded-md border-l-2 border-viridian bg-viridian-wash px-3 py-2.5 text-sm leading-relaxed text-viridian">
                {notice}
              </p>
            )}

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
              {submitting ? HEADINGS[flow].busy : HEADINGS[flow].action}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-pencil">
            {flow === "signIn" && (
              <>
                No account yet?{" "}
                <button className="btn-quiet" onClick={() => go("signUp")}>
                  Create one
                </button>
              </>
            )}
            {flow === "signUp" && (
              <>
                Already registered?{" "}
                <button className="btn-quiet" onClick={() => go("signIn")}>
                  Sign in
                </button>
              </>
            )}
            {flow === "forgot" && (
              <button className="btn-quiet" onClick={() => go("signIn")}>
                Back to sign in
              </button>
            )}
            {flow === "code" && (
              <>
                Did not get it?{" "}
                <button className="btn-quiet" onClick={() => go("forgot")}>
                  Send another code
                </button>
              </>
            )}
            {flow === "reset" && (
              <button className="btn-quiet" onClick={() => go("code")}>
                Back to the code
              </button>
            )}
          </p>
        </div>

        <SiteFooter />
      </section>
    </main>
  );
}

const HEADINGS: Record<
  Flow,
  { title: string; blurb: string; action: string; busy: string }
> = {
  signIn: {
    title: "Sign in",
    blurb: "Use the email address registered with the association.",
    action: "Sign in",
    busy: "Signing in",
  },
  signUp: {
    title: "Create your account",
    blurb: "Use the email address the chair registered for you.",
    action: "Create account",
    busy: "Creating",
  },
  forgot: {
    title: "Reset your password",
    blurb:
      "Tell us your email address and we will send a code you can use to set a new password.",
    action: "Send the code",
    busy: "Sending",
  },
  code: {
    title: "Enter your code",
    blurb: "Check your email for the eight-digit code we just sent.",
    action: "Continue",
    busy: "Checking",
  },
  reset: {
    title: "Choose a new password",
    blurb: "Pick a new password for your account.",
    action: "Save new password",
    busy: "Saving",
  },
};

/** Errors here should say what to do, not repeat what the server threw. */
function messageFor(flow: Flow, caught: unknown): string {
  if (flow === "signIn") {
    return "That email and password do not match. Check for typos, or reset your password.";
  }
  if (flow === "forgot") {
    return "We could not send the code. Check the address and try again.";
  }
  if (flow === "reset") {
    return "That code is wrong or has expired. Ask for a new one and try again.";
  }
  return errorMessage(caught);
}
