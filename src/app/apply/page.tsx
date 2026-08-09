"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { LOAN_AMOUNTS, deductionFor } from "@convex/lib/loan";
import { errorMessage, formatPeso } from "@/lib/format";

export default function ApplyPage() {
  const coMakers = useQuery(api.applications.eligibleCoMakers);
  const submit = useMutation(api.applications.submit);
  const router = useRouter();

  const [loanType, setLoanType] = useState<"regular" | "emergency">("regular");
  const [loanAmount, setLoanAmount] = useState<number>(LOAN_AMOUNTS[0]);
  const [coMakerMemberId, setCoMakerMemberId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Derived, never chosen separately. The workbook offered these as two loose
  // dropdowns, so a 6,000 loan could be paired with an 1,800 deduction.
  const deduction = deductionFor(loanAmount) ?? 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (coMakerMemberId === "") {
      setError("Choose a co-maker before filing.");
      return;
    }

    setSubmitting(true);
    try {
      await submit({
        coMakerMemberId: coMakerMemberId as Id<"members">,
        loanType,
        loanAmount,
        deductionPerPayday: deduction,
      });
      router.push("/dashboard");
    } catch (caught) {
      setError(errorMessage(caught));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <span className="eyebrow">Loan Committee</span>
      <h1 className="page-title mt-1.5">Loan application</h1>
      <p className="mt-2 max-w-lg font-display text-[0.9375rem] leading-relaxed text-ink-pencil">
        Payable within five (5) months, deducted every quincena. Your loan
        number is issued the moment you file.
      </p>

      <hr className="mt-6 border-rule-strong" />

      <form onSubmit={handleSubmit} className="mt-8 space-y-9">
        <fieldset>
          <legend className="label">Loan type</legend>
          <div className="flex border border-rule-strong">
            {(["regular", "emergency"] as const).map((type, index) => (
              <label
                key={type}
                className={`flex-1 cursor-pointer px-4 py-2.5 text-center text-sm capitalize transition-colors ${
                  index > 0 ? "border-l border-rule-strong" : ""
                } ${
                  loanType === type
                    ? "bg-ink font-medium text-leaf"
                    : "text-ink-pencil hover:bg-black/[0.03]"
                }`}
              >
                <input
                  type="radio"
                  name="loanType"
                  value={type}
                  checked={loanType === type}
                  onChange={() => setLoanType(type)}
                  className="sr-only"
                />
                {type}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Amount and its consequence, shown as one statement. */}
        <fieldset>
          <legend className="label">Amount</legend>
          <div className="grid gap-px border border-rule bg-rule sm:grid-cols-3">
            {LOAN_AMOUNTS.map((amount) => {
              const selected = amount === loanAmount;
              return (
                <label
                  key={amount}
                  className={`cursor-pointer bg-leaf px-4 py-4 transition-colors ${
                    selected ? "bg-viridian-wash" : "hover:bg-black/[0.03]"
                  }`}
                >
                  <input
                    type="radio"
                    name="loanAmount"
                    value={amount}
                    checked={selected}
                    onChange={() => setLoanAmount(amount)}
                    className="sr-only"
                  />
                  <span
                    className={`tnum block font-mono text-lg ${
                      selected ? "font-medium text-viridian" : "text-ink"
                    }`}
                  >
                    {formatPeso(amount)}
                  </span>
                  <span
                    className={`mt-1 block text-xs ${
                      selected ? "text-viridian/75" : "text-ink-faint"
                    }`}
                  >
                    {formatPeso(deductionFor(amount) ?? 0)} × 10 paydays
                  </span>
                </label>
              );
            })}
          </div>
          <p className="mt-2.5 text-xs text-ink-faint">
            The deduction follows from the amount: ten payments across five
            months.
          </p>
        </fieldset>

        <div>
          <label className="label" htmlFor="coMaker">
            Co-maker
          </label>
          <select
            id="coMaker"
            className="input"
            value={coMakerMemberId}
            onChange={(event) => setCoMakerMemberId(event.target.value)}
            disabled={coMakers === undefined || coMakers.length === 0}
          >
            <option value="">
              {coMakers === undefined ? "Loading" : "Select a co-maker"}
            </option>
            {coMakers?.map((candidate) => (
              <option key={candidate._id} value={candidate._id}>
                {candidate.name}
                {candidate.position ? ` — ${candidate.position}` : ""}
              </option>
            ))}
          </select>
          <p className="mt-2.5 text-xs text-ink-faint">
            Must be in permanent status, so only permanent members are listed.
          </p>
          {coMakers?.length === 0 && (
            <p className="mt-2.5 border-l-2 border-oxide bg-oxide-wash px-3 py-2 text-sm text-oxide">
              No permanent members are registered yet. Ask the chair to add them
              before you file.
            </p>
          )}
        </div>

        {error !== null && (
          <p
            role="alert"
            className="border-l-2 border-oxide bg-oxide-wash px-3 py-2 text-sm text-oxide"
          >
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-5 border-t border-rule-strong pt-6">
          <button
            type="button"
            className="btn-quiet"
            onClick={() => router.push("/dashboard")}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Filing" : "File application"}
          </button>
        </div>
      </form>
    </div>
  );
}
