"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { Medallion } from "@/components/object/Medallion";
import { SOCIAL_LINKS } from "@/components/SiteFooter";
import { Spinner } from "@/components/Spinner";
import { toUserMessage } from "@/lib/errors";

export type Flow = "signIn" | "signUp" | "verify" | "forgot" | "code" | "reset";

/**
 * Whether this deployment can send mail. Resend refuses every recipient until a
 * domain is verified, and offering "Forgot password?" before then sends people
 * down a path that cannot work. Defaults to on; set
 * NEXT_PUBLIC_EMAIL_ENABLED=false to hide it.
 */
const EMAIL_ENABLED = process.env.NEXT_PUBLIC_EMAIL_ENABLED !== "false";

export function SignInForm({ initialFlow = "signIn" }: { initialFlow?: Flow }) {
  const { signIn } = useAuthActions();
  const router = useRouter();

  const [flow, setFlow] = useState<Flow>(initialFlow);
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
      } else if (flow === "signUp") {
        form.set("flow", "signUp");
        try {
          await signIn("password", form);
        } catch (caught) {
          // The account row is written before the code is sent, so a mail
          // failure strands an unconfirmed account and every later attempt
          // reports "already exists". Signing in re-sends the code for exactly
          // that account, which is the recovery the person wants. A wrong
          // password still fails, so this cannot take over someone else's.
          if (!/already exists/i.test(String(caught))) throw caught;
          const retry = new FormData();
          retry.set("flow", "signIn");
          retry.set("email", address);
          retry.set("password", String(form.get("password") ?? ""));
          const { signingIn } = await signIn("password", retry);
          if (signingIn) {
            // Already confirmed: they simply had an account all along.
            router.push("/dashboard");
            return;
          }
        }
        setEmail(address);
        setFlow("verify");
        setNotice(
          `We sent a confirmation code to ${address}. It is good for one hour.`,
        );
      } else if (flow === "verify") {
        form.set("flow", "email-verification");
        form.set("email", email);
        await signIn("password", form);
        router.push("/dashboard");
        return;
      } else {
        form.set("flow", flow);
        const { signingIn } = await signIn("password", form);
        if (!signingIn) {
          // Correct password, but the address was never confirmed — the server
          // has just sent a fresh code rather than a session.
          setEmail(address);
          setFlow("verify");
          setNotice(
            `Confirm your email first. We sent a new code to ${address}.`,
          );
        } else {
          router.push("/dashboard");
          return;
        }
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
    <div className="object-white min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Left: home. The landing page in brief, with the way back to it, so
          sign-in never feels like a dead end. */}
      <section className="relative hidden flex-col overflow-hidden bg-ow-mist px-12 py-9 lg:sticky lg:top-0 lg:flex lg:h-screen xl:px-16">
        <Link
          href="/"
          className="flex w-fit items-center gap-2.5 rounded"
          aria-label="PIT Faculty Association, home"
        >
          <Image src="/pit-logo.png" alt="" width={32} height={32} priority />
          <span className="text-[1.0625rem] font-semibold tracking-[-0.01em]">
            PIT Faculty Association
          </span>
        </Link>

        {/* The medallion steps aside on short screens so the steps and the
            way home always fit without scrolling. */}
        <div className="my-auto py-8">
          <Medallion className="mb-10 w-[10rem] [@media(max-height:860px)]:hidden xl:w-[11rem]" />
          <p className="ow-eyebrow">Palompon Institute of Technology</p>
          <p className="ow-display mt-4 text-[2.75rem] xl:text-[3.25rem]">
            Apply once.
            <br />
            <span className="font-medium">See every step.</span>
          </p>

          <ol className="mt-8 max-w-md divide-y divide-ow-line/80 border-y border-ow-line/80">
            {STEPS.map(([term, detail], index) => (
              <li key={term} className="flex gap-5 py-3.5">
                <span className="tnum w-6 shrink-0 pt-px text-sm font-[300] text-ow-gray">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block text-[0.9375rem] font-semibold">{term}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-ow-gray">
                    {detail}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex items-center justify-between gap-6">
          <Link href="/" className="ow-link text-[0.9375rem]">
            <span className="chev-back" aria-hidden="true">‹</span> Back to home
          </Link>
          <ul className="flex items-center gap-2" aria-label="The association elsewhere">
            {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} (opens in a new tab)`}
                  title={label}
                  className="grid h-9 w-9 place-items-center rounded-full border border-ow-line text-ow-gray transition-colors duration-200 hover:border-ow-ink hover:text-ow-ink"
                >
                  <Icon />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Right: sign in. */}
      <section className="flex min-h-screen flex-col">
        {/* On a phone the left column is hidden, so home lives up here, on
            the left where it was on the wide screen. */}
        <div className="flex h-16 items-center justify-between px-4 sm:px-8 lg:hidden">
          <Link href="/" className="ow-link text-[0.9375rem]">
            <span className="chev-back" aria-hidden="true">‹</span> Home
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 rounded"
            aria-label="PIT Faculty Association, home"
          >
            <Image src="/pit-logo.png" alt="" width={28} height={28} priority />
            <span className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
              PIT Faculty Association
            </span>
          </Link>
        </div>

        <main className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-8 lg:px-14">
        <div className="mx-auto w-full max-w-[24rem]">
          {/* Keyed on the step, so each change of step settles in rather
              than swapping text in place. */}
          <div key={flow} className="rise">
            <h1 className="ow-display text-[2.5rem] sm:text-[3rem]">
              {HEADINGS[flow].title}
            </h1>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ow-gray">
              {HEADINGS[flow].blurb}
            </p>
          </div>

          <form
            onSubmit={flow === "code" ? handleCodeStep : handleSubmit}
            className="mt-8 space-y-5"
          >
            {flow === "code" || flow === "verify" ? (
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
                <p className="mt-2.5 text-xs text-ow-gray">
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
                      {flow === "signIn" && EMAIL_ENABLED && (
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
              <p
                aria-live="polite"
                className="notice rise"
              >
                {notice}
              </p>
            )}

            {error !== null && (
              <p
                role="alert"
                className="notice-error rise"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3.5 text-[0.9375rem]"
            >
              {submitting && <Spinner />}
              {submitting ? HEADINGS[flow].busy : HEADINGS[flow].action}
            </button>
          </form>

          {flow === "signIn" && !EMAIL_ENABLED && (
            <p className="mt-4 text-xs leading-relaxed text-ow-gray">
              Forgotten your password? Ask the Chair of the Loan Committee to
              set a new one for you.
            </p>
          )}

          <p className="mt-7 text-sm text-ow-gray">
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
            {flow === "verify" && (
              <>
                Wrong address?{" "}
                <button className="btn-quiet" onClick={() => go("signUp")}>
                  Start again
                </button>
              </>
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
        </main>

        <p className="px-4 pb-6 text-center text-xs text-ow-gray sm:px-8">
          © {new Date().getFullYear()} PIT Faculty Association · Palompon, Leyte
        </p>
      </section>
    </div>
  );
}

const STEPS = [
  ["File", "Your number is issued the moment you apply."],
  [
    "Review",
    "Loans: two committee members decide, then the chair. Claims: the chair alone.",
  ],
  ["Release", "The treasurer records it and files your form."],
] as const;

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
  verify: {
    title: "Confirm your email",
    blurb: "We sent a code to your address. Enter it to finish setting up.",
    action: "Confirm email",
    busy: "Confirming",
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

/**
 * Errors here should say what to do next. `toUserMessage` recognises the known
 * causes (an address already taken, a bad code, a mail failure); the fallback
 * only supplies context when it does not, rather than overriding a message that
 * was already specific.
 */
function messageFor(flow: Flow, caught: unknown): string {
  switch (flow) {
    case "signIn":
      return toUserMessage(
        caught,
        "That email and password do not match. Check for typos, or reset your password.",
      );
    case "signUp":
      return toUserMessage(
        caught,
        "We could not create that account. Check the address and try again.",
      );
    case "forgot":
      return toUserMessage(
        caught,
        "We could not send the code. Check the address and try again.",
      );
    default:
      return toUserMessage(
        caught,
        "That code is wrong or has expired. Ask for a new one and try again.",
      );
  }
}
