"use client";

import { StatusBadge } from "@/components/StatusBadge";
import {
  formatDate,
  formatDateTime,
  formatPeso,
  roleTitle,
  type Status,
} from "@/lib/format";

type Decision = {
  _id: string;
  approverRole: string;
  approverName: string;
  decision: "approved" | "rejected";
  remarks?: string;
  decidedAt: number;
};

export type DetailApplication = {
  _id: string;
  queueNumber: string;
  borrowerName: string;
  coMakerName: string;
  loanType: "regular" | "emergency";
  loanAmount: number;
  deductionPerPayday: number;
  termMonths: number;
  dateFiled: number;
  startDate?: number;
  status: Status;
  outcome?: "approved" | "rejected";
  releasedAt?: number;
  releasedAmount?: number;
  decisions: Decision[];
};

const APPROVAL_SEQUENCE = ["committee1", "committee2", "chair"] as const;

export function ApplicationDetail({
  application,
  children,
}: {
  application: DetailApplication;
  children?: React.ReactNode;
}) {
  const canPrint =
    application.status === "approved" ||
    application.status === "released" ||
    application.status === "archived";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-muted">
            Loan number
          </p>
          <h1 className="font-mono text-2xl font-semibold">
            {application.queueNumber}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={application.status} outcome={application.outcome} />
          {canPrint && (
            <a
              href={`/api/applications/${application._id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Print form
            </a>
          )}
        </div>
      </div>

      <section className="card p-6">
        <h2 className="mb-4 font-serif text-lg font-semibold">Application</h2>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <Field label="Borrower" value={application.borrowerName} />
          <Field label="Co-maker" value={application.coMakerName} />
          <Field
            label="Loan type"
            value={application.loanType === "regular" ? "Regular" : "Emergency"}
          />
          <Field label="Loan amount" value={formatPeso(application.loanAmount)} />
          <Field
            label="Deduction per payday"
            value={`${formatPeso(application.deductionPerPayday)} × 10 payments`}
          />
          <Field label="Term" value={`${application.termMonths} months`} />
          <Field label="Date filed" value={formatDate(application.dateFiled)} />
          <Field
            label="Effective date"
            value={
              application.startDate === undefined
                ? "Set once the chair approves"
                : formatDate(application.startDate)
            }
          />
          {application.releasedAt !== undefined && (
            <>
              <Field
                label="Released on"
                value={formatDate(application.releasedAt)}
              />
              <Field
                label="Amount released"
                value={formatPeso(application.releasedAmount ?? 0)}
              />
            </>
          )}
        </dl>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 font-serif text-lg font-semibold">Approvals</h2>
        <ol className="space-y-3">
          {APPROVAL_SEQUENCE.map((role) => {
            const decision = application.decisions.find(
              (d) => d.approverRole === role,
            );
            return (
              <li
                key={role}
                className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-stone-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{roleTitle(role)}</p>
                  {decision === undefined ? (
                    <p className="mt-0.5 text-sm text-ink-muted">Awaiting decision</p>
                  ) : (
                    <>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        {decision.approverName} ·{" "}
                        {formatDateTime(decision.decidedAt)}
                      </p>
                      {decision.remarks && (
                        <p className="mt-1 text-sm italic text-ink-muted">
                          “{decision.remarks}”
                        </p>
                      )}
                    </>
                  )}
                </div>
                <span
                  className={`badge ${
                    decision === undefined
                      ? "bg-stone-100 text-stone-600"
                      : decision.decision === "approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {decision === undefined
                    ? "Pending"
                    : decision.decision === "approved"
                      ? "Approved"
                      : "Disapproved"}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}
