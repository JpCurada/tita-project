"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { errorMessage, formatPeso, toDateInputValue } from "@/lib/format";

export default function ReleasePage() {
  const queue = useQuery(api.applications.listQueue);

  if (queue === undefined) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  const readyForRelease = queue.filter((app) => app.status === "approved");

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold">Release loans</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Approved loans awaiting release. Recording a release files the
        application into the archive.
      </p>

      {readyForRelease.length === 0 ? (
        <p className="card mt-6 p-6 text-sm text-ink-muted">
          No approved loans are awaiting release.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {readyForRelease.map((app) => (
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
      // Midday avoids the released date sliding a day either way when the
      // stored instant is read back in another timezone.
      const releasedAt = new Date(`${date}T12:00:00+08:00`).getTime();
      await recordRelease({
        applicationId,
        releasedAmount: Number(amount),
        releasedAt,
      });
    } catch (caught) {
      setError(errorMessage(caught));
      setSaving(false);
    }
  }

  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-sm font-semibold">{queueNumber}</p>
        <p className="text-sm text-ink-muted">
          Approved for {formatPeso(loanAmount)}
        </p>
      </div>
      <p className="mt-1 text-sm">{borrowerName}</p>

      <form
        onSubmit={handleRelease}
        className="mt-4 flex flex-wrap items-end gap-3 border-t border-stone-200 pt-4"
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
            className="input"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        <div className="w-48">
          <label className="label" htmlFor={`date-${applicationId}`}>
            Date released
          </label>
          <input
            id={`date-${applicationId}`}
            type="date"
            required
            className="input"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Recording…" : "Record release"}
        </button>
      </form>

      {error !== null && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
    </li>
  );
}
