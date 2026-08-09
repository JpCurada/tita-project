"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@convex/_generated/api";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatPeso } from "@/lib/format";

export default function QueuePage() {
  const member = useQuery(api.members.getCurrentMember);
  const queue = useQuery(api.applications.listQueue);

  if (queue === undefined || member === undefined) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }
  if (member === null) return null;

  const isApprover =
    member.role === "committee1" ||
    member.role === "committee2" ||
    member.role === "chair";

  /** True when this approver still owes a decision at the current stage. */
  const awaitingMe = (app: (typeof queue)[number]) => {
    if (!isApprover) return false;
    const alreadyVoted = app.decisions.some(
      (d) => d.approverRole === member.role,
    );
    if (alreadyVoted) return false;
    return member.role === "chair"
      ? app.status === "chair_review"
      : app.status === "pending";
  };

  const mine = queue.filter(awaitingMe);
  const rest = queue.filter((app) => !awaitingMe(app));

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold">Loan queue</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Applications in the order they were filed.
      </p>

      {isApprover && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Awaiting your decision ({mine.length})
          </h2>
          {mine.length === 0 ? (
            <p className="card p-6 text-sm text-ink-muted">
              Nothing needs your decision right now.
            </p>
          ) : (
            <ul className="space-y-3">
              {mine.map((app) => (
                <QueueRow key={app._id} app={app} highlight />
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          {isApprover ? "Everything else in progress" : "In progress"} ({rest.length})
        </h2>
        {rest.length === 0 ? (
          <p className="card p-6 text-sm text-ink-muted">
            No other applications are in progress.
          </p>
        ) : (
          <ul className="space-y-3">
            {rest.map((app) => (
              <QueueRow key={app._id} app={app} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function QueueRow({
  app,
  highlight = false,
}: {
  app: {
    _id: string;
    queueNumber: string;
    borrowerName: string;
    loanAmount: number;
    dateFiled: number;
    status: "pending" | "chair_review" | "approved" | "released" | "archived";
    outcome?: "approved" | "rejected";
  };
  highlight?: boolean;
}) {
  return (
    <li>
      <Link
        href={`/queue/${app._id}`}
        className={`card flex flex-wrap items-center justify-between gap-4 p-5 transition hover:border-stone-400 ${
          highlight ? "border-l-4 border-l-amber-500" : ""
        }`}
      >
        <div>
          <p className="font-mono text-sm font-semibold">{app.queueNumber}</p>
          <p className="mt-1 text-sm">{app.borrowerName}</p>
          <p className="mt-0.5 text-sm text-ink-muted">
            {formatPeso(app.loanAmount)} · filed {formatDate(app.dateFiled)}
          </p>
        </div>
        <StatusBadge status={app.status} outcome={app.outcome} />
      </Link>
    </li>
  );
}
