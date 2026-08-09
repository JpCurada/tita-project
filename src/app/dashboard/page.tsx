"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@convex/_generated/api";
import { QueueStub } from "@/components/QueueStub";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatPeso } from "@/lib/format";

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
        <p className="eyebrow mt-8">Loading</p>
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
                className="leaf mt-3 flex flex-wrap items-center gap-x-8 gap-y-5 p-5 transition-colors hover:border-rule-strong"
              >
                <QueueStub queueNumber={open.queueNumber} size="lg" tone="viridian" />

                <dl className="flex flex-1 flex-wrap gap-x-10 gap-y-4">
                  <Cell label="Amount" value={formatPeso(open.loanAmount)} mono />
                  <Cell
                    label="Per payday"
                    value={formatPeso(open.deductionPerPayday)}
                    mono
                  />
                  <Cell label="Filed" value={formatDate(open.dateFiled)} />
                </dl>

                <StatusBadge status={open.status} outcome={open.outcome} />
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
              <ul className="mt-3 divide-y divide-rule border-y border-rule">
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
