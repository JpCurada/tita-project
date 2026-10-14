"use client";

import { QueueStub } from "@/components/QueueStub";
import { StatusBadge } from "@/components/StatusBadge";
import {
  formatDate,
  formatDateTime,
  formatPeso,
  isClaim,
  roleSeat,
  typeLabel,
  type ApplicationType,
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
  // Unset on claims, which have no co-maker and are not repaid.
  coMakerName?: string;
  loanType: ApplicationType;
  loanAmount: number;
  deductionPerPayday?: number;
  termMonths?: number;
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

/** A claim goes to the chair alone; the committee seats never see it. */
const CLAIM_CHAIN = ["chair"] as const;

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

  const claim = isClaim(application.loanType);
  const chain = claim ? CLAIM_CHAIN : CHAIN;

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
        <QueueStub
          queueNumber={application.queueNumber}
          size="lg"
          label={claim ? "Claim number" : "Loan number"}
        />
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

      <hr className="mt-6 border-rule" />

      {/* Terms, set as a ruled grid: the way the paper form reads. */}
      <section className="mt-7">
        <span className="eyebrow">Terms</span>
        <dl className="mt-3 grid gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
          <Cell
            label={claim ? "Claimant" : "Borrower"}
            value={application.borrowerName}
          />
          {!claim && (
            <Cell label="Co-maker" value={application.coMakerName ?? "None"} />
          )}
          <Cell
            label={claim ? "Claim type" : "Loan type"}
            value={typeLabel(application.loanType)}
          />
          <Cell label="Filed" value={formatDate(application.dateFiled)} />
          <Cell
            label={claim ? "Amount claimed" : "Amount"}
            value={formatPeso(application.loanAmount)}
            mono
          />
          {/* Repayment terms exist only for loans. */}
          {!claim && (
            <>
              <Cell
                label="Per payday"
                value={formatPeso(application.deductionPerPayday ?? 0)}
                mono
              />
              <Cell
                label="Term"
                value={`${application.termMonths ?? 0} months · 10 paydays`}
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
            </>
          )}
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
        <ol className="leaf mt-3 p-5 sm:p-6">
          {chain.map((role, index) => {
            const decision = application.decisions.find(
              (d) => d.approverRole === role,
            );
            const last = index === chain.length - 1;
            const rejected = decision?.decision === "rejected";

            return (
              <li key={role} className="flex gap-4">
                {/* The rail: a ring on a line, connected until the last stop.
                    Hollow while waiting, filled once decided. */}
                <div
                  className="flex flex-col items-center"
                  aria-hidden="true"
                >
                  <span
                    className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${
                      decision === undefined
                        ? isNext(application, role)
                          ? "border-viridian bg-white"
                          : "border-rule-strong bg-white"
                        : rejected
                          ? "border-oxide bg-oxide"
                          : "border-viridian bg-viridian"
                    }`}
                  />
                  {!last && (
                    <span
                      className={`w-px flex-1 ${
                        decision === undefined ? "my-1 bg-rule" : "my-1 bg-viridian/35"
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
                        <p className="mt-2.5 rounded-xl bg-bond px-4 py-3 text-sm leading-relaxed text-ink-pencil">
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
    <div className="bg-white px-5 py-4">
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
