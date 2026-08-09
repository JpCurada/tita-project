"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@convex/_generated/api";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatPeso } from "@/lib/format";

export default function DashboardPage() {
  const applications = useQuery(api.applications.listMine);

  const hasOpenLoan =
    applications?.some((app) => app.status !== "archived") ?? false;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">My loan applications</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Your queue number is issued the moment you file.
          </p>
        </div>
        {!hasOpenLoan && (
          <Link href="/apply" className="btn-primary">
            File a loan application
          </Link>
        )}
      </div>

      {applications === undefined ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : applications.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-ink-muted">
            You have not filed any loan application yet.
          </p>
          <Link href="/apply" className="btn-primary mt-4">
            File your first application
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {applications.map((app) => (
            <li key={app._id}>
              <Link
                href={`/dashboard/${app._id}`}
                className="card flex flex-wrap items-center justify-between gap-4 p-5 transition hover:border-stone-400"
              >
                <div>
                  <p className="font-mono text-sm font-semibold">
                    {app.queueNumber}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {formatPeso(app.loanAmount)} ·{" "}
                    {app.loanType === "regular" ? "Regular" : "Emergency"} · filed{" "}
                    {formatDate(app.dateFiled)}
                  </p>
                </div>
                <StatusBadge status={app.status} outcome={app.outcome} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hasOpenLoan && (
        <p className="mt-6 text-sm text-ink-muted">
          You may file a new application once your current one has been released
          or rejected.
        </p>
      )}
    </div>
  );
}
