"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ApplicationDetail } from "@/components/ApplicationDetail";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { errorMessage, formatPeso, roleTitle } from "@/lib/format";
import { SkeletonDetail } from "@/components/Skeleton";

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const applicationId = params.id as Id<"applications">;

  const member = useQuery(api.members.getCurrentMember);
  const application = useQuery(api.applications.get, { applicationId });
  const castDecision = useMutation(api.applications.castDecision);

  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"approved" | "rejected" | null>(null);
  const [confirming, setConfirming] = useState<"approved" | "rejected" | null>(
    null,
  );

  if (application === undefined || member === undefined) {
    return <SkeletonDetail />;
  }
  if (member === null) return null;

  const isApprover =
    member.role === "committee1" ||
    member.role === "committee2" ||
    member.role === "chair";
  const alreadyVoted = application.decisions.some(
    (d) => d.approverRole === member.role,
  );
  const atMyStage =
    member.role === "chair"
      ? application.status === "chair_review"
      : application.status === "pending";
  const canDecide = isApprover && !alreadyVoted && atMyStage;

  async function decide(decision: "approved" | "rejected") {
    setError(null);
    setPending(decision);
    try {
      await castDecision({
        applicationId,
        decision,
        remarks: remarks.trim() === "" ? undefined : remarks.trim(),
      });
      setRemarks("");
      setConfirming(null);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <Link href="/queue" className="btn-quiet mb-7 inline-block">
        Back to queue
      </Link>

      <ApplicationDetail application={application}>
        {isApprover && (
          <section className="mt-9 border-t-2 border-ink pt-6">
            <span className="eyebrow">Your decision</span>
            <h2 className="section-title mt-1.5">{roleTitle(member.role)}</h2>

            {canDecide ? (
              <div className="mt-5 max-w-xl space-y-5">
                <div>
                  <label className="label" htmlFor="remarks">
                    Remarks
                    <span className="font-normal text-ink-faint">
                      {" "}
                      — required to disapprove, recorded permanently
                    </span>
                  </label>
                  <textarea
                    id="remarks"
                    className="input min-h-20 resize-y"
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    placeholder="Why this loan is being approved or turned down"
                  />
                </div>

                {error !== null && (
                  <p
                    role="alert"
                    className="border-l-2 border-oxide bg-oxide-wash px-3 py-2 text-sm text-oxide"
                  >
                    {error}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    className="btn-primary"
                    onClick={() => setConfirming("approved")}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => {
                      // The borrower is told why, so there has to be a why.
                      if (remarks.trim() === "") {
                        setError(
                          "Give a reason above before disapproving. The borrower is told why.",
                        );
                        return;
                      }
                      setError(null);
                      setConfirming("rejected");
                    }}
                  >
                    Disapprove
                  </button>
                  <p className="text-xs text-ink-faint">
                    A decision is final and cannot be changed.
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-pencil">
                {alreadyVoted
                  ? "You have already recorded your decision on this application."
                  : member.role === "chair"
                    ? "Both committee members must approve before the chair decides."
                    : "This application has moved past the committee stage."}
              </p>
            )}
          </section>
        )}

        {member.role === "treasurer" && application.status === "approved" && (
          <section className="mt-9 border-t-2 border-ink pt-6">
            <span className="eyebrow">Treasurer</span>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-pencil">
              This loan is approved and ready for release. Record it on the{" "}
              <Link href="/release" className="btn-quiet">
                release
              </Link>{" "}
              screen.
            </p>
          </section>
        )}
      </ApplicationDetail>

      <ConfirmDialog
        open={confirming !== null}
        title={
          confirming === "rejected"
            ? "Disapprove this application?"
            : "Approve this application?"
        }
        confirmLabel={
          confirming === "rejected" ? "Yes, disapprove" : "Yes, approve"
        }
        cancelLabel="Go back"
        tone={confirming === "rejected" ? "danger" : "default"}
        busy={pending !== null}
        busyLabel="Recording"
        onConfirm={() => confirming !== null && void decide(confirming)}
        onCancel={() => setConfirming(null)}
      >
        <p>
          Loan{" "}
          <span className="tnum font-mono font-medium text-ink">
            {application.queueNumber}
          </span>{" "}
          for{" "}
          <span className="font-medium text-ink">{application.borrowerName}</span>
          , {formatPeso(application.loanAmount)}.
        </p>
        <p className="mt-2.5">
          {confirming === "rejected"
            ? "This ends the application immediately — the remaining approvers will not be asked. The borrower is emailed your reason. It cannot be undone."
            : "Your name is recorded against this decision permanently, and the borrower is emailed. It cannot be changed."}
        </p>
        {remarks.trim() !== "" && (
          <p className="mt-3 border-l-2 border-rule-strong pl-3 italic">
            “{remarks.trim()}”
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
