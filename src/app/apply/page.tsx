"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  CLAIM_TYPES,
  LOAN_AMOUNTS,
  LOAN_TYPES,
  MAX_CLAIM_AMOUNT,
  deductionFor,
  isClaim,
  typeLabel,
  validateClaimAmount,
  type ApplicationType,
} from "@convex/lib/loan";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { errorMessage, formatPeso } from "@/lib/format";

export default function ApplyPage() {
  const coMakers = useQuery(api.applications.eligibleCoMakers);
  const submit = useMutation(api.applications.submit);
  const submitClaim = useMutation(api.applications.submitClaim);
  const router = useRouter();

  const [loanType, setLoanType] = useState<ApplicationType>("regular");
  const [loanAmount, setLoanAmount] = useState<number>(LOAN_AMOUNTS[0]);
  // Kept as typed so a half-entered figure is not reformatted under the cursor.
  const [claimAmount, setClaimAmount] = useState("");
  const [coMakerMemberId, setCoMakerMemberId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Derived, never chosen separately. The workbook offered these as two loose
  // dropdowns, so a 6,000 loan could be paired with an 1,800 deduction.
  const deduction = deductionFor(loanAmount) ?? 0;

  const selectedCoMaker = coMakers?.find((c) => c._id === coMakerMemberId);

  // Claims ask only for the amount: nothing is repaid, so there is no co-maker
  // or deduction, and the chair decides alone.
  const claim = isClaim(loanType);
  const claimed = Number(claimAmount);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (claim) {
      const amountError = validateClaimAmount(claimed);
      if (claimAmount.trim() === "" || amountError !== null) {
        setError(amountError ?? "Enter the amount claimed.");
        return;
      }
      setConfirming(true);
      return;
    }
    if (coMakerMemberId === "") {
      setError("Choose a co-maker before filing.");
      return;
    }
    setConfirming(true);
  }

  async function file() {
    setError(null);
    setSubmitting(true);
    try {
      if (isClaim(loanType)) {
        await submitClaim({ claimType: loanType, amount: claimed });
      } else {
        await submit({
          coMakerMemberId: coMakerMemberId as Id<"members">,
          loanType,
          loanAmount,
          deductionPerPayday: deduction,
        });
      }
      router.push("/dashboard");
    } catch (caught) {
      setError(errorMessage(caught));
      setConfirming(false);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <span className="eyebrow">New application</span>
      <h1 className="page-title mt-1.5">
        {claim ? "Claim application" : "Loan application"}
      </h1>
      <p className="mt-2 max-w-lg text-[0.9375rem] leading-relaxed text-ink-pencil">
        {claim
          ? "Decided by the Chair of the Loan Committee alone. Your claim number is issued the moment you file."
          : "Payable within five (5) months, deducted every quincena. Your loan number is issued the moment you file."}
      </p>

      <hr className="mt-6 border-rule" />

      <form onSubmit={handleSubmit} className="mt-8 space-y-9">
        <fieldset>
          <legend className="label">Type</legend>
          {/* A segmented control: the chosen type rises out of a grey track,
              the way a hardware switch sits proud of its housing. */}
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-bond p-1 sm:grid-cols-4">
            {[...LOAN_TYPES, ...CLAIM_TYPES].map((type) => (
              <label
                key={type}
                className={`cursor-pointer rounded-xl px-4 py-2.5 text-center text-sm transition-[background-color,box-shadow,color] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-viridian ${
                  loanType === type
                    ? "bg-white font-semibold text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.04)]"
                    : "text-ink-pencil hover:text-ink"
                }`}
              >
                <input
                  type="radio"
                  name="loanType"
                  value={type}
                  checked={loanType === type}
                  onChange={() => {
                    setLoanType(type);
                    setError(null);
                  }}
                  className="sr-only"
                />
                <span className="block">{typeLabel(type)}</span>
                <span
                  className={`block text-[0.6875rem] ${
                    loanType === type ? "font-normal text-ink-pencil" : "text-ink-faint"
                  }`}
                >
                  {isClaim(type) ? "Claim" : "Loan"}
                </span>
              </label>
            ))}
          </div>
          {/* Regular and emergency loans carry the same amounts and the same
              five-month term; the choice only records which one this was. */}
          <p className="mt-2.5 text-xs text-ink-faint">
            {claim
              ? "A claim needs no co-maker and is not deducted from your salary. Claims are numbered separately from loans."
              : "Both loan types use the same amounts and terms. This is recorded on your form."}
          </p>
        </fieldset>

        {claim && (
          <div>
            <label className="label" htmlFor="claimAmount">
              Amount claimed
            </label>
            <div className="relative max-w-56">
              <span
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-ink-faint"
                aria-hidden="true"
              >
                ₱
              </span>
              <input
                id="claimAmount"
                type="number"
                inputMode="numeric"
                min="1"
                max={MAX_CLAIM_AMOUNT}
                step="1"
                className="input tnum pl-8 font-mono"
                value={claimAmount}
                onChange={(event) => setClaimAmount(event.target.value)}
              />
            </div>
            <p className="mt-2.5 text-xs text-ink-faint">
              In whole pesos. The chair reviews the amount when deciding.
            </p>
          </div>
        )}

        {/* Amount and its consequence, shown as one statement. */}
        {!claim && (
          <>
            <fieldset>
              <legend className="label">Amount</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {LOAN_AMOUNTS.map((amount) => {
                  const selected = amount === loanAmount;
                  return (
                    <label
                      key={amount}
                      className={`relative cursor-pointer rounded-2xl border bg-white px-5 py-4
                                  transition-[border-color,box-shadow] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-viridian/40 ${
                        selected
                          ? "border-viridian shadow-[0_0_0_1px_#1a3d8f]"
                          : "border-rule-strong hover:border-ink/40"
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
                      {/* A tick, so selection does not rest on colour alone. */}
                      {selected && (
                        <span
                          className="absolute right-3 top-3 grid h-4 w-4 place-items-center rounded-full bg-viridian text-white"
                          aria-hidden="true"
                        >
                          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                            <path
                              d="M1.5 5.2 3.9 7.5 8.5 2.5"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      )}
                      <span
                        className={`tnum block font-mono text-lg font-medium ${
                          selected ? "text-viridian" : "text-ink"
                        }`}
                      >
                        {formatPeso(amount)}
                      </span>
                      <span
                        className={`mt-1 block text-xs ${
                          selected ? "text-ink-pencil" : "text-ink-faint"
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
                    {candidate.position ? ` · ${candidate.position}` : ""}
                    {candidate.registered ? "" : " (not yet signed up)"}
                  </option>
                ))}
              </select>
              <p className="mt-2.5 text-xs text-ink-faint">
                Must be a registered member in permanent status, so only permanent
                members are listed.
              </p>
              {selectedCoMaker !== undefined && !selectedCoMaker.registered && (
                <p className="mt-3 rounded-xl bg-amber-wash px-4 py-3 text-sm leading-relaxed text-amber-ledger">
                  {selectedCoMaker.name} is on the roll but has not created an
                  account yet. You can still file. Ask them to sign up so they can
                  follow this loan too.
                </p>
              )}
              {coMakers?.length === 0 && (
                <p className="notice-error mt-3">
                  No permanent members are registered yet. Ask the chair to add them
                  before you file.
                </p>
              )}
            </div>
          </>
        )}

        {error !== null && (
          <p
            role="alert"
            className="notice-error rise"
          >
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-5 border-t border-rule pt-6">
          <button
            type="button"
            className="btn-quiet"
            onClick={() => router.push("/dashboard")}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            File application
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirming}
        title="File this application?"
        confirmLabel="Yes, file it"
        busy={submitting}
        busyLabel="Filing"
        onConfirm={() => void file()}
        onCancel={() => setConfirming(false)}
      >
        <dl className="space-y-1.5">
          <div className="flex justify-between gap-4">
            <dt>Type</dt>
            <dd className="font-medium text-ink">
              {typeLabel(loanType)} {claim ? "claim" : "loan"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Amount</dt>
            <dd className="tnum font-mono font-medium text-ink">
              {formatPeso(claim ? claimed : loanAmount)}
            </dd>
          </div>
          {!claim && (
            <>
              <div className="flex justify-between gap-4">
                <dt>Per payday</dt>
                <dd className="tnum font-mono font-medium text-ink">
                  {formatPeso(deduction)} × 10
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Co-maker</dt>
                <dd className="font-medium text-ink">{selectedCoMaker?.name}</dd>
              </div>
            </>
          )}
        </dl>
        <p className="mt-3">
          Your {claim ? "claim" : "loan"} number is issued now. You cannot file
          another {claim ? "claim" : "loan"} until this one is released or
          declined.
        </p>
      </ConfirmDialog>
    </div>
  );
}
