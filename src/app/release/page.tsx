"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { QueueStub } from "@/components/QueueStub";
import {
  errorMessage,
  formatPeso,
  isClaim,
  toDateInputValue,
  typeLabel,
} from "@/lib/format";
import { SkeletonPage } from "@/components/Skeleton";

export default function ReleasePage() {
  const queue = useQuery(api.applications.listQueue);

  if (queue === undefined) {
    return <SkeletonPage rows={2} />;
  }

  const ready = queue.filter((app) => app.status === "approved");

  return (
    <div className="max-w-3xl">
      <span className="eyebrow">Treasurer</span>
      <h1 className="page-title mt-1.5">Release</h1>
      <p className="mt-2 max-w-lg text-[0.9375rem] leading-relaxed text-ink-pencil">
        Approved loans and claims waiting to be paid out. Recording a release
        files the application into the archive.
      </p>

      <hr className="mt-6 border-rule" />

      {ready.length === 0 ? (
        <p className="mt-8 empty-well">
          No approved loans or claims are waiting for release.
        </p>
      ) : (
        <ul className="stagger mt-8 space-y-5">
          {ready.map((app) => (
            <ReleaseCard
              key={app._id}
              applicationId={app._id as Id<"applications">}
              queueNumber={app.queueNumber}
              borrowerName={app.borrowerName}
              loanAmount={app.loanAmount}
              claimLabel={
                isClaim(app.loanType) ? `${typeLabel(app.loanType)} claim` : null
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReleaseCard({
  applicationId,
  queueNumber,
  borrowerName,
  loanAmount,
  claimLabel,
}: {
  applicationId: Id<"applications">;
  queueNumber: string;
  borrowerName: string;
  loanAmount: number;
  /** Set for a claim, e.g. "Hospitalization claim"; null for a loan. */
  claimLabel: string | null;
}) {
  const recordRelease = useMutation(api.applications.recordRelease);
  const [amount, setAmount] = useState(String(loanAmount));
  const [date, setDate] = useState(toDateInputValue(Date.now()));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const enteredAmount = Number(amount);
  // Worth calling out before committing: the amount released is what the
  // borrower is recorded as having received.
  const differsFromApproved =
    Number.isFinite(enteredAmount) && enteredAmount !== loanAmount;

  async function handleRelease() {
    setError(null);
    setSaving(true);
    try {
      // Midday keeps the released date from sliding a day either way when the
      // stored instant is read back in another timezone.
      await recordRelease({
        applicationId,
        releasedAmount: enteredAmount,
        releasedAt: new Date(`${date}T12:00:00+08:00`).getTime(),
      });
      setConfirming(false);
    } catch (caught) {
      setError(errorMessage(caught));
      setConfirming(false);
      setSaving(false);
    }
  }

  return (
    <li className="leaf p-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <QueueStub queueNumber={queueNumber} />
        <span className="flex-1 text-sm font-medium">
          {borrowerName}
          {claimLabel !== null && (
            <span className="ml-2 text-xs font-normal text-ink-faint">
              {claimLabel}
            </span>
          )}
        </span>
        <span className="tnum font-mono text-sm text-ink-pencil">
          approved for {formatPeso(loanAmount)}
        </span>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setConfirming(true);
        }}
        className="mt-5 flex flex-wrap items-end gap-x-7 gap-y-4 border-t border-rule pt-5"
      >
        <div className="w-40">
          <label className="label" htmlFor={`amount-${applicationId}`}>
            Amount released
          </label>
          <input
            id={`amount-${applicationId}`}
            type="number"
            min="1"
            step="0.01"
            required
            className="input tnum font-mono"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        <div className="w-44">
          <label className="label" htmlFor={`date-${applicationId}`}>
            Date released
          </label>
          <input
            id={`date-${applicationId}`}
            type="date"
            required
            className="input tnum font-mono"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={saving}>
          Record release
        </button>
      </form>

      {error !== null && (
        <p
          role="alert"
          className="mt-4 notice-error"
        >
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirming}
        title="Record this release?"
        confirmLabel="Record release"
        busy={saving}
        busyLabel="Recording"
        onConfirm={() => void handleRelease()}
        onCancel={() => setConfirming(false)}
      >
        <p>
          {claimLabel === null ? "Loan" : "Claim"}{" "}
          <span className="tnum font-mono font-medium text-ink">
            {queueNumber}
          </span>{" "}
          for <span className="font-medium text-ink">{borrowerName}</span>.
        </p>
        <dl className="mt-3 space-y-1.5">
          <div className="flex justify-between gap-4">
            <dt>Amount released</dt>
            <dd className="tnum font-mono font-medium text-ink">
              {formatPeso(enteredAmount)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Date released</dt>
            <dd className="font-medium text-ink">{date}</dd>
          </div>
        </dl>
        {differsFromApproved && (
          <p className="mt-3 rounded-xl bg-amber-wash px-4 py-3 text-amber-ledger">
            This differs from the approved amount of {formatPeso(loanAmount)}.
          </p>
        )}
        <p className="mt-3">
          This files the application into the archive. It cannot be undone.
        </p>
      </ConfirmDialog>
    </li>
  );
}
