"use client";

import { QueueStub } from "@/components/QueueStub";
import { StatusBadge } from "@/components/StatusBadge";
import {
  formatDate,
  formatDateTime,
  formatPeso,
  roleSeat,
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

/** The chain is genuinely ordered, so the rail encodes real sequence. */
const CHAIN = ["committee1", "committee2", "chair"] as const;

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
    <div>
      <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
        <QueueStub queueNumber={application.queueNumber} size="lg" />
        <div className="flex flex-wrap items-center gap-4">
          <StatusBadge status={application.status} outcome={application.outcome} />
          {canPrint && (
            <a
              href={`/api/applications/${application._id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Open printable form
            </a>
          )}
        </div>
      </header>

      <hr className="mt-6 border-rule-strong" />

      {/* Terms, set as a ruled grid — the way the paper form reads. */}
      <section className="mt-7">
        <span className="eyebrow">Terms</span>
        <dl className="mt-3 grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
          <Cell label="Borrower" value={application.borrowerName} />
          <Cell label="Co-maker" value={application.coMakerName} />
          <Cell
            label="Loan type"
            value={application.loanType === "regular" ? "Regular" : "Emergency"}
          />
          <Cell label="Filed" value={formatDate(application.dateFiled)} />
          <Cell label="Amount" value={formatPeso(application.loanAmount)} mono />
          <Cell
            label="Per payday"
            value={formatPeso(application.deductionPerPayday)}
            mono
          />
          <Cell
            label="Term"
            value={`${application.termMonths} months · 10 paydays`}
          />
          <Cell
            label="Effective"
            value={
              application.startDate === undefined
                ? "On the chair's approval"
                : formatDate(application.startDate)
            }
            muted={application.startDate === undefined}
          />
          {application.releasedAt !== undefined && (
            <>
              <Cell label="Released" value={formatDate(application.releasedAt)} />
              <Cell
                label="Amount released"
                value={formatPeso(application.releasedAmount ?? 0)}
                mono
              />
            </>
          )}
        </dl>
      </section>

      <section className="mt-9">
        <span className="eyebrow">Decisions</span>
        <ol className="mt-3">
          {CHAIN.map((role, index) => {
            const decision = application.decisions.find(
              (d) => d.approverRole === role,
            );
            const last = index === CHAIN.length - 1;
            const rejected = decision?.decision === "rejected";

            return (
              <li key={role} className="flex gap-4">
                {/* The rail: a mark on a line, connected until the last stop. */}
                <div
                  className="flex flex-col items-center"
                  aria-hidden="true"
                >
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rotate-45 border ${
                      decision === undefined
                        ? "border-rule-strong bg-leaf"
                        : rejected
                          ? "border-oxide bg-oxide"
                          : "border-viridian bg-viridian"
                    }`}
                  />
                  {!last && (
                    <span
                      className={`w-px flex-1 ${
                        decision === undefined ? "bg-rule" : "bg-viridian/35"
                      }`}
                    />
                  )}
                </div>

                <div className={last ? "pb-0" : "pb-7"}>
                  <p className="text-sm font-medium leading-tight">
                    {roleSeat(role)}
                  </p>

                  {decision === undefined ? (
                    <p className="mt-1 text-sm text-ink-faint">
                      {isNext(application, role)
                        ? "Awaiting decision"
                        : "Not yet reached"}
                    </p>
                  ) : (
                    <>
                      <p className="mt-1 text-sm text-ink-pencil">
                        <span
                          className={
                            rejected
                              ? "font-medium text-oxide"
                              : "font-medium text-viridian"
                          }
                        >
                          {rejected ? "Disapproved" : "Approved"}
                        </span>
                        {" by "}
                        {decision.approverName}
                        <span className="text-ink-faint">
                          {" · "}
                          {formatDateTime(decision.decidedAt)}
                        </span>
                      </p>
                      {decision.remarks && (
                        <p className="mt-2 border-l-2 border-rule-strong pl-3 font-display text-sm italic leading-relaxed text-ink-pencil">
                          {decision.remarks}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {children}
    </div>
  );
}

/** True when this role is the one currently holding the application. */
function isNext(application: DetailApplication, role: string): boolean {
  if (application.status === "pending") {
    return role === "committee1" || role === "committee2";
  }
  if (application.status === "chair_review") return role === "chair";
  return false;
}

function Cell({
  label,
  value,
  mono = false,
  muted = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="bg-leaf px-4 py-3">
      <dt className="eyebrow">{label}</dt>
      <dd
        className={`mt-1.5 text-sm ${mono ? "tnum font-mono" : ""} ${
          muted ? "text-ink-faint" : "text-ink"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
