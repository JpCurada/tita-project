"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@convex/_generated/api";
import { QueueStub } from "@/components/QueueStub";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatPeso } from "@/lib/format";
import { SkeletonRows } from "@/components/Skeleton";

export default function DashboardPage() {
  const applications = useQuery(api.applications.listMine);
  const open = applications?.find((app) => app.status !== "archived");
  const past = applications?.filter((app) => app.status === "archived") ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Your record</span>
          <h1 className="page-title mt-1.5">Loans</h1>
        </div>
        {applications !== undefined && open === undefined && (
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
            When you file an application, your loan number is issued
            immediately and you can follow each decision here.
          </p>
          <Link href="/apply" className="btn-primary mt-6">
            File an application
          </Link>
        </div>
      ) : (
        <>
          {open !== undefined && (
            <section className="mt-8">
              <span className="eyebrow text-viridian">In progress</span>
              <Link
                href={`/dashboard/${open._id}`}
                className="leaf-interactive mt-3 flex flex-wrap items-center gap-x-8 gap-y-5 p-5"
              >
                {/* Stub and status stay on one line at every width: together
                    they answer "which loan, and where is it?". */}
                <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:flex-none">
                  <QueueStub
                    queueNumber={open.queueNumber}
                    size="lg"
                    tone="viridian"
                  />
                  <span className="sm:hidden">
                    <StatusBadge status={open.status} outcome={open.outcome} />
                  </span>
                </div>

                <dl className="flex flex-1 flex-wrap gap-x-10 gap-y-4">
                  <Cell label="Amount" value={formatPeso(open.loanAmount)} mono />
                  <Cell
                    label="Per payday"
                    value={formatPeso(open.deductionPerPayday)}
                    mono
                  />
                  <Cell label="Filed" value={formatDate(open.dateFiled)} />
                </dl>

                <span className="hidden sm:block">
                  <StatusBadge status={open.status} outcome={open.outcome} />
                </span>

                {/* Where the loan has reached, and what is left. The status
                    words alone do not say how much of the process remains. */}
                <div className="w-full border-t border-rule pt-4">
                  <Progress status={open.status} />
                </div>
              </Link>
              <p className="mt-3 text-xs text-ink-faint">
                You can file another application once this one is released or
                declined.
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
 * Three stages, in the order they happen. The current one is named in full so
 * the borrower knows who is holding the application right now.
 */
function Progress({ status }: { status: "pending" | "chair_review" | "approved" | "released" | "archived" }) {
  const stages = [
    { key: "committee", label: "Committee" },
    { key: "chair", label: "Chair" },
    { key: "release", label: "Release" },
  ];
  const reached =
    status === "pending" ? 0 : status === "chair_review" ? 1 : 2;

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
