"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@convex/_generated/api";
import { QueueStub } from "@/components/QueueStub";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatPeso, isClaim, typeLabel } from "@/lib/format";
import { SkeletonRows } from "@/components/Skeleton";

export default function DashboardPage() {
  const applications = useQuery(api.applications.listMine);
  // A member may have one loan and one claim in flight at once.
  const open = applications?.filter((app) => app.status !== "archived") ?? [];
  const past = applications?.filter((app) => app.status === "archived") ?? [];
  const canFile = !(
    open.some((app) => !isClaim(app.loanType)) &&
    open.some((app) => isClaim(app.loanType))
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Your record</span>
          <h1 className="page-title mt-1.5">Loans and claims</h1>
        </div>
        {applications !== undefined && canFile && (
          <Link href="/apply" className="btn-primary">
            File an application
          </Link>
        )}
      </div>

      <hr className="mt-5 border-rule-strong" />

      {applications === undefined ? (
        <SkeletonRows count={3} />
      ) : applications.length === 0 ? (
        <div className="mt-8 border border-dashed border-rule-strong px-6 py-14 text-center">
          <p className="font-display text-lg text-ink">Nothing on file yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-pencil">
            When you file a loan or a claim, its number is issued
            immediately and you can follow each decision here.
          </p>
          <Link href="/apply" className="btn-primary mt-6">
            File an application
          </Link>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <section className="mt-8">
              <span className="eyebrow text-viridian">In progress</span>
              {open.map((app) => (
                <Link
                  key={app._id}
                  href={`/dashboard/${app._id}`}
                  className="leaf-interactive mt-3 flex flex-wrap items-center gap-x-8 gap-y-5 p-5"
                >
                  {/* Stub and status stay on one line at every width: together
                      they answer "which application, and where is it?". */}
                  <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:flex-none">
                    <QueueStub
                      queueNumber={app.queueNumber}
                      size="lg"
                      tone="viridian"
                    />
                    <span className="sm:hidden">
                      <StatusBadge status={app.status} outcome={app.outcome} />
                    </span>
                  </div>

                  <dl className="flex flex-1 flex-wrap gap-x-10 gap-y-4">
                    <Cell label="Amount" value={formatPeso(app.loanAmount)} mono />
                    {app.deductionPerPayday === undefined ? (
                      <Cell label="Claim" value={typeLabel(app.loanType)} />
                    ) : (
                      <Cell
                        label="Per payday"
                        value={formatPeso(app.deductionPerPayday)}
                        mono
                      />
                    )}
                    <Cell label="Filed" value={formatDate(app.dateFiled)} />
                  </dl>

                  <span className="hidden sm:block">
                    <StatusBadge status={app.status} outcome={app.outcome} />
                  </span>

                  {/* Where the application has reached, and what is left. The status
                      words alone do not say how much of the process remains. */}
                  <div className="w-full border-t border-rule pt-4">
                    <Progress status={app.status} claim={isClaim(app.loanType)} />
                  </div>
                </Link>
              ))}
              <p className="mt-3 text-xs text-ink-faint">
                You can file another loan or claim once the one in progress is
                released or declined.
              </p>
            </section>
          )}

          {past.length > 0 && (
            <section className="mt-10">
              <span className="eyebrow">Settled</span>
              <ul className="stagger mt-3 divide-y divide-rule border-y border-rule">
                {past.map((app) => (
                  <li key={app._id}>
                    <Link
                      href={`/dashboard/${app._id}`}
                      className="flex flex-wrap items-center gap-x-6 gap-y-3 py-3.5 transition-colors hover:bg-black/[0.02]"
                    >
                      <QueueStub queueNumber={app.queueNumber} tone="muted" />
                      <span className="tnum flex-1 font-mono text-sm">
                        {formatPeso(app.loanAmount)}
                      </span>
                      <span className="text-sm text-ink-pencil">
                        {formatDate(app.dateFiled)}
                      </span>
                      <StatusBadge status={app.status} outcome={app.outcome} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/**
 * The stages, in the order they happen. The current one is named in full so
 * the borrower knows who is holding the application right now. A claim skips
 * the committee, so it has two stages, not three.
 */
function Progress({
  status,
  claim,
}: {
  status: "pending" | "chair_review" | "approved" | "released" | "archived";
  claim: boolean;
}) {
  const stages = [
    ...(claim ? [] : [{ key: "committee", label: "Committee" }]),
    { key: "chair", label: "Chair" },
    { key: "release", label: "Release" },
  ];
  const reached =
    (status === "pending" ? 0 : status === "chair_review" ? 1 : 2) -
    (claim ? 1 : 0);

  return (
    <div className="flex items-center gap-2">
      {stages.map((stage, index) => {
        const done = index < reached;
        const current = index === reached;
        return (
          <div key={stage.key} className="flex flex-1 items-center gap-2">
            <div className="flex-1">
              <div
                className={`h-1 rounded-full transition-colors duration-300 ${
                  done || current ? "bg-viridian" : "bg-rule"
                }`}
              />
              <span
                className={`mt-1.5 block text-[0.6875rem] ${
                  current
                    ? "font-semibold text-viridian"
                    : done
                      ? "text-ink-pencil"
                      : "text-ink-faint"
                }`}
              >
                {current ? `With the ${stage.label.toLowerCase()}` : stage.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Cell({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className={`mt-1 text-sm ${mono ? "tnum font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
