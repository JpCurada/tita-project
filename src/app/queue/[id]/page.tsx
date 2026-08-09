"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ApplicationDetail } from "@/components/ApplicationDetail";
import { errorMessage, roleTitle } from "@/lib/format";

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const applicationId = params.id as Id<"applications">;

  const member = useQuery(api.members.getCurrentMember);
  const application = useQuery(api.applications.get, { applicationId });
  const castDecision = useMutation(api.applications.castDecision);

  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"approved" | "rejected" | null>(null);

  if (application === undefined || member === undefined) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
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
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <Link
        href="/queue"
        className="mb-6 inline-block text-sm text-ink-muted hover:text-ink"
      >
        ← Back to queue
      </Link>

      <ApplicationDetail application={application}>
        {isApprover && (
          <section className="card p-6">
            <h2 className="font-serif text-lg font-semibold">
              Your decision as {roleTitle(member.role)}
            </h2>

            {canDecide ? (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="label" htmlFor="remarks">
                    Remarks <span className="font-normal text-ink-muted">(optional)</span>
                  </label>
                  <textarea
                    id="remarks"
                    className="input min-h-20 resize-y"
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    placeholder="Any note to record with your decision"
                  />
                </div>

                {error !== null && (
                  <p
                    role="alert"
                    className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"
                  >
                    {error}
                  </p>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    className="btn-primary"
                    disabled={pending !== null}
                    onClick={() => void decide("approved")}
                  >
                    {pending === "approved" ? "Recording…" : "Approve"}
                  </button>
                  <button
                    className="btn-danger"
                    disabled={pending !== null}
                    onClick={() => void decide("rejected")}
                  >
                    {pending === "rejected" ? "Recording…" : "Disapprove"}
                  </button>
                </div>
                <p className="text-xs text-ink-muted">
                  A decision is final and cannot be changed. Disapproving ends
                  the application immediately.
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">
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
          <section className="card p-6">
            <p className="text-sm text-ink-muted">
              This loan is approved and ready for release. Record it on the{" "}
              <Link href="/release" className="font-medium text-ink underline">
                Release
              </Link>{" "}
              screen.
            </p>
          </section>
        )}
      </ApplicationDetail>
    </div>
  );
}
