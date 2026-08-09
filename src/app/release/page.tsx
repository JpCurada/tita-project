"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { QueueStub } from "@/components/QueueStub";
import { errorMessage, formatPeso, toDateInputValue } from "@/lib/format";
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
      <p className="mt-2 max-w-lg font-display text-[0.9375rem] leading-relaxed text-ink-pencil">
        Approved loans waiting to be paid out. Recording a release files the
        application into the archive.
      </p>

      <hr className="mt-6 border-rule-strong" />

      {ready.length === 0 ? (
        <p className="mt-8 border border-dashed border-rule-strong px-5 py-12 text-center text-sm text-ink-pencil">
          No approved loans are waiting for release.
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
}: {
  applicationId: Id<"applications">;
  queueNumber: string;
  borrowerName: string;
  loanAmount: number;
}) {
  const recordRelease = useMutation(api.applications.recordRelease);
  const [amount, setAmount] = useState(String(loanAmount));
  const [date, setDate] = useState(toDateInputValue(Date.now()));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleRelease(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // Midday keeps the released date from sliding a day either way when the
      // stored instant is read back in another timezone.
      await recordRelease({
        applicationId,
        releasedAmount: Number(amount),
        releasedAt: new Date(`${date}T12:00:00+08:00`).getTime(),
      });
    } catch (caught) {
      setError(errorMessage(caught));
      setSaving(false);
    }
  }

  return (
    <li className="leaf p-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <QueueStub queueNumber={queueNumber} />
        <span className="flex-1 text-sm font-medium">{borrowerName}</span>
        <span className="tnum font-mono text-sm text-ink-pencil">
          approved for {formatPeso(loanAmount)}
        </span>
      </div>

      <form
        onSubmit={handleRelease}
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
          {saving ? "Recording" : "Record release"}
        </button>
      </form>

      {error !== null && (
        <p
          role="alert"
          className="mt-4 border-l-2 border-oxide bg-oxide-wash px-3 py-2 text-sm text-oxide"
        >
          {error}
        </p>
      )}
    </li>
  );
}
