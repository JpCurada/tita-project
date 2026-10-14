"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@convex/_generated/api";
import { QueueStub } from "@/components/QueueStub";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatPeso, isClaim, typeLabel } from "@/lib/format";
import type { ApplicationType } from "@/lib/format";
import { SkeletonPage } from "@/components/Skeleton";

export default function QueuePage() {
  const member = useQuery(api.members.getCurrentMember);
  const queue = useQuery(api.applications.listQueue);

  if (queue === undefined || member === undefined) {
    return <SkeletonPage rows={4} />;
  }
  if (member === null) return null;

  const isApprover =
    member.role === "committee1" ||
    member.role === "committee2" ||
    member.role === "chair";

  /**
   * True when this approver still owes a decision at the current stage. A
   * claim is filed straight to the chair, so it is never the committee's.
   */
  const awaitingMe = (app: (typeof queue)[number]) => {
    if (!isApprover) return false;
    if (app.decisions.some((d) => d.approverRole === member.role)) return false;
    return member.role === "chair"
      ? app.status === "chair_review"
      : !isClaim(app.loanType) && app.status === "pending";
  };

  const mine = queue.filter(awaitingMe);
  const rest = queue.filter((app) => !awaitingMe(app));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Loan Committee</span>
          <h1 className="page-title mt-1.5">Queue</h1>
        </div>
        <p className="tnum font-mono text-sm text-ink-pencil">
          {queue.length} in progress
        </p>
      </div>

      <hr className="mt-6 border-rule" />

      {isApprover && (
        <section className="mt-8">
          <div className="flex items-baseline gap-3">
            <span className="eyebrow text-viridian">For your decision</span>
            <span className="tnum font-mono text-xs text-ink-faint">
              {mine.length}
            </span>
          </div>

          {mine.length === 0 ? (
            <p className="mt-3 empty-well">
              Nothing is waiting on you.
            </p>
          ) : (
            <ul className="stagger mt-3 row-list">
              {mine.map((app) => (
                <Row key={app._id} app={app} emphasis />
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-10">
        <span className="eyebrow">
          {isApprover ? "Elsewhere in the queue" : "In progress"}
        </span>
        {rest.length === 0 ? (
          <p className="mt-3 empty-well">
            No other applications are in progress.
          </p>
        ) : (
          <ul className="stagger mt-3 row-list">
            {rest.map((app) => (
              <Row key={app._id} app={app} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({
  app,
  emphasis = false,
}: {
  app: {
    _id: string;
    queueNumber: string;
    borrowerName: string;
    loanType: ApplicationType;
    loanAmount: number;
    dateFiled: number;
    status: "pending" | "chair_review" | "approved" | "released" | "archived";
    outcome?: "approved" | "rejected";
  };
  emphasis?: boolean;
}) {
  return (
    <li>
      <Link
        href={`/queue/${app._id}`}
        className="row-link"
      >
        <QueueStub
          queueNumber={app.queueNumber}
          tone={emphasis ? "viridian" : "ink"}
        />
        <span className="min-w-40 flex-1 text-sm">
          {app.borrowerName}
          {isClaim(app.loanType) && (
            <span className="ml-2 text-xs text-ink-faint">
              {typeLabel(app.loanType)} claim
            </span>
          )}
        </span>
        <span className="tnum font-mono text-sm">
          {formatPeso(app.loanAmount)}
        </span>
        <span className="hidden text-sm text-ink-faint sm:block">
          {formatDate(app.dateFiled)}
        </span>
        <StatusBadge status={app.status} outcome={app.outcome} />
      </Link>
    </li>
  );
}
