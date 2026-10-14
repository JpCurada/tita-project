import type { Metadata } from "next";
import Link from "next/link";
import {
  AMOUNT_TO_DEDUCTION,
  LOAN_AMOUNTS,
  MAX_CLAIM_AMOUNT,
  TERM_MONTHS,
} from "@convex/lib/loan";
import { Medallion } from "@/components/object/Medallion";
import { ObjectFooter } from "@/components/object/ObjectFooter";
import { ObjectNav } from "@/components/object/ObjectNav";
import { objectFont } from "@/lib/fonts";

/**
 * The public front door. Signed-in members never see it — the middleware sends
 * them straight to their dashboard — so it speaks to someone deciding whether
 * to sign in, and to the colleague who followed a link from Facebook.
 *
 * Every figure below comes from convex/lib/loan.ts, the same rules the
 * application form enforces, so this page cannot drift from what is allowed.
 */

export const metadata: Metadata = {
  title: "PIT Faculty Association — Loans and Claims",
};

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

const NAV_LINKS = [
  { href: "#file", label: "Loans & claims" },
  { href: "#process", label: "How it works" },
];

const SPECS = [
  `${LOAN_AMOUNTS.map(peso).join(" · ")}`,
  `${TERM_MONTHS} months, every quincena`,
  "Queue number on filing",
  "Members only",
];

const STEPS = [
  {
    term: "File",
    detail:
      "Fill in the form online. Your queue number is issued the moment you submit — no waiting to find out where you stand.",
  },
  {
    term: "Review",
    detail:
      "Loans go to two committee members, then the chair. Claims go to the chair alone. You see each decision as it is made.",
  },
  {
    term: "Release",
    detail:
      "The treasurer records the release and your printed form is filed. The record of who decided what, and when, stays with it.",
  },
];

export default function Home() {
  return (
    <div className={`${objectFont.variable} object-white flex min-h-screen flex-col`}>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-ow-ink px-4 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        Skip to content
      </a>

      <ObjectNav
        links={NAV_LINKS}
        action={
          <Link href="/signin" className="ow-pill-sm">
            Sign in
          </Link>
        }
      />

      <main id="main" className="flex-1">
        {/* ---- Hero ---------------------------------------------------- */}
        <section className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-6xl flex-col items-center px-4 pt-10 text-center sm:px-8 sm:pt-14">
          <p className="ow-eyebrow rise">
            Palompon Institute of Technology — Faculty Association
          </p>

          <h1
            className="ow-display rise mt-5 text-[2.875rem] sm:text-[4.25rem] lg:text-[5.25rem]"
            style={{ animationDelay: "60ms" }}
          >
            Apply once.
            <br />
            <span className="font-medium">See every step.</span>
          </h1>

          <p
            className="rise mt-5 max-w-[30rem] text-[1rem] leading-[1.6] text-ow-gray sm:text-[1.0625rem]"
            style={{ animationDelay: "120ms" }}
          >
            Loans and hospitalization claims for association members — filed
            online, numbered the moment you apply, and decided with a record of
            who signed off.
          </p>

          <div
            className="rise mt-7 flex flex-col items-center gap-4 sm:flex-row sm:gap-7"
            style={{ animationDelay: "180ms" }}
          >
            <Link href="/signin" className="ow-pill">
              Sign in to apply
            </Link>
            <Link href="/signin?mode=signup" className="ow-link text-[1rem]">
              Create an account <span className="chev" aria-hidden="true">›</span>
            </Link>
          </div>

          <Medallion
            className="rise mt-10 w-[13.5rem] sm:mt-12 sm:w-[15rem]"
          />

          {/* Spec line: what a member wants to know before signing in. */}
          <ul
            className="mt-auto flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 pb-7 pt-12 text-[0.8125rem] tracking-[0.02em] text-ow-gray"
            aria-label="At a glance"
          >
            {SPECS.map((spec, i) => (
              <li key={spec} className="flex items-center gap-3.5">
                {i > 0 && (
                  <span aria-hidden="true" className="hidden text-ow-line sm:inline">
                    |
                  </span>
                )}
                <span className="tnum">{spec}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- What you can file -------------------------------------- */}
        <section
          id="file"
          aria-labelledby="file-title"
          className="scroll-mt-16 border-t border-ow-line/70"
        >
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8 sm:py-28 lg:px-12">
            <div className="text-center">
              <p className="ow-eyebrow">What you can file</p>
              <h2
                id="file-title"
                className="ow-display mt-4 text-[2.25rem] sm:text-[3.25rem]"
              >
                Two ways the association
                <br className="hidden sm:block" />{" "}
                <span className="font-medium">stands behind you.</span>
              </h2>
            </div>

            <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-ow-line/70 bg-ow-line/70 md:grid-cols-2">
              <Offer
                eyebrow="Loans"
                headline={`${peso(LOAN_AMOUNTS[0])}–${peso(LOAN_AMOUNTS[LOAN_AMOUNTS.length - 1])}`}
                lede="Borrow in one of three amounts and repay through payroll."
                rows={[
                  ["Types", "Regular · Emergency"],
                  ["Repayment", `${TERM_MONTHS} months, deducted every quincena`],
                  [
                    "Per payday",
                    LOAN_AMOUNTS.map((a) => peso(AMOUNT_TO_DEDUCTION[a])).join(" · "),
                  ],
                  ["Decided by", "Two committee members, then the chair"],
                ]}
              />
              <Offer
                eyebrow="Claims"
                headline="Nothing to repay."
                lede="Assistance when you or your family need care. You state the amount; the chair decides."
                rows={[
                  ["Types", "Hospitalization · Terminal illness"],
                  ["Amount", `As stated, up to ${peso(MAX_CLAIM_AMOUNT)}`],
                  ["Co-maker", "Not needed"],
                  ["Decided by", "The chair"],
                ]}
              />
            </div>
          </div>
        </section>

        {/* ---- How it works ------------------------------------------- */}
        <section
          id="process"
          aria-labelledby="process-title"
          className="scroll-mt-16 bg-ow-mist"
        >
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8 sm:py-28 lg:px-12">
            <div className="text-center">
              <p className="ow-eyebrow">How it works</p>
              <h2
                id="process-title"
                className="ow-display mt-4 text-[2.25rem] sm:text-[3.25rem]"
              >
                Filed, decided,
                <br className="hidden sm:block" />{" "}
                <span className="font-medium">released.</span>
              </h2>
            </div>

            <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
              {STEPS.map((step, i) => (
                <li key={step.term} className="border-t border-ow-line pt-6">
                  <span className="tnum block text-[3rem] font-[200] leading-none tracking-[-0.04em] text-ow-gray/60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-5 text-[1.1875rem] font-semibold">
                    {step.term}
                  </h3>
                  <p className="mt-2 text-[0.9375rem] leading-[1.6] text-ow-gray">
                    {step.detail}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---- Close -------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-8 sm:py-32">
          <h2 className="ow-display text-[2.25rem] sm:text-[3.5rem]">
            Ready when
            <br />
            <span className="font-medium">you are.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[1rem] leading-[1.6] text-ow-gray">
            Use the email address registered with the association. If you are
            new, the chair adds you first.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-7">
            <Link href="/signin" className="ow-pill">
              Sign in
            </Link>
            <Link href="/signin?mode=signup" className="ow-link text-[1rem]">
              Create an account <span className="chev" aria-hidden="true">›</span>
            </Link>
          </div>
        </section>
      </main>

      <ObjectFooter />
    </div>
  );
}

function Offer({
  eyebrow,
  headline,
  lede,
  rows,
}: {
  eyebrow: string;
  headline: string;
  lede: string;
  rows: [string, string][];
}) {
  return (
    <article className="flex flex-col bg-white p-7 sm:p-10">
      <p className="ow-eyebrow">{eyebrow}</p>
      <p className="tnum mt-4 text-[2rem] font-[250] leading-[1.05] tracking-[-0.04em] sm:text-[2.5rem]">
        {headline}
      </p>
      <p className="mb-8 mt-3 max-w-sm text-[0.9375rem] leading-[1.6] text-ow-gray">
        {lede}
      </p>
      <dl className="mt-auto divide-y divide-ow-line/70 border-t border-ow-line/70 text-[0.875rem]">
        {rows.map(([term, detail]) => (
          <div key={term} className="flex justify-between gap-6 py-3.5">
            <dt className="shrink-0 text-ow-gray">{term}</dt>
            <dd className="tnum text-right font-medium">{detail}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
