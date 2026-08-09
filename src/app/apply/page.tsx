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
  const [coMakerMemberId, setCoMakerMemberId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Derived, never independently chosen — the spreadsheet let these two drift
  // apart, which is how a ₱6,000 loan could be paired with a ₱1,800 deduction.
  const deduction = deductionFor(loanAmount) ?? 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (coMakerMemberId === "") {
      setError("Please choose a co-maker.");
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
      <h1 className="font-serif text-2xl font-semibold">Loan application</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Payable within five (5) months, deducted every quincena.
      </p>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-6 p-6">
        <fieldset>
          <legend className="label">Loan type</legend>
          <div className="flex gap-3">
            {(["regular", "emergency"] as const).map((type) => (
              <label
                key={type}
                className={`flex flex-1 cursor-pointer items-center justify-center rounded-md border px-4 py-2.5 text-sm capitalize transition ${
                  loanType === type
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-300 bg-white hover:bg-stone-50"
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

        <div>
          <label className="label" htmlFor="loanAmount">
            Loan amount
          </label>
          <select
            id="loanAmount"
            className="input"
            value={loanAmount}
            onChange={(event) => setLoanAmount(Number(event.target.value))}
          >
            {LOAN_AMOUNTS.map((amount) => (
              <option key={amount} value={amount}>
                {formatPeso(amount)}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-md bg-stone-100 px-4 py-3">
          <p className="text-sm text-ink-muted">Deduction per payday</p>
          <p className="mt-0.5 text-lg font-semibold">{formatPeso(deduction)}</p>
          <p className="mt-1 text-xs text-ink-muted">
            10 payments over 5 months — computed from the loan amount.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="coMaker">
            Co-maker
          </label>
          <select
            id="coMaker"
            className="input"
            value={coMakerMemberId}
            onChange={(event) => setCoMakerMemberId(event.target.value)}
            disabled={coMakers === undefined}
          >
            <option value="">
              {coMakers === undefined ? "Loading…" : "Select a co-maker"}
            </option>
            {coMakers?.map((candidate) => (
              <option key={candidate._id} value={candidate._id}>
                {candidate.name}
                {candidate.position ? ` — ${candidate.position}` : ""}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-ink-muted">
            Must be in permanent status. Only permanent members appear here.
          </p>
          {coMakers?.length === 0 && (
            <p className="mt-1.5 text-xs text-red-700">
              No eligible co-makers are registered yet. Ask the chair to add
              permanent members.
            </p>
          )}
        </div>

        {error !== null && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-stone-200 pt-5">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push("/dashboard")}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Filing…" : "File application"}
          </button>
        </div>
      </form>
    </div>
  );
}
