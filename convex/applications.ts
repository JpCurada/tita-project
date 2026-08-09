import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import {
  approverMutation,
  memberMutation,
  memberQuery,
  staffQuery,
  treasurerMutation,
} from "./lib/auth";
import { TERM_MONTHS, validateLoanTerms } from "./lib/loan";
import { nextQueueNumber } from "./lib/queue";
import { decisionValidator, loanTypeValidator } from "./schema";

/** Joins an application with its decisions and the names behind them. */
async function withApprovals(ctx: QueryCtx, application: Doc<"applications">) {
  const approvals = await ctx.db
    .query("approvals")
    .withIndex("by_application", (q) => q.eq("applicationId", application._id))
    .collect();

  const decisions = await Promise.all(
    approvals.map(async (approval) => {
      const approver = await ctx.db.get(approval.approverMemberId);
      return {
        ...approval,
        approverName: approver ? fullName(approver) : "(removed)",
      };
    }),
  );
  decisions.sort((a, b) => a.decidedAt - b.decidedAt);
  return { ...application, decisions };
}

export function fullName(member: Doc<"members">): string {
  const middle = member.middleName ? ` ${member.middleName}` : "";
  return `${member.firstName}${middle} ${member.lastName}`;
}

/* -------------------------------------------------------------------------- */
/* Submission                                                                 */
/* -------------------------------------------------------------------------- */

export const submit = memberMutation({
  args: {
    coMakerMemberId: v.id("members"),
    loanType: loanTypeValidator,
    loanAmount: v.number(),
    deductionPerPayday: v.number(),
  },
  handler: async (ctx, args) => {
    const termsError = validateLoanTerms(args.loanAmount, args.deductionPerPayday);
    if (termsError !== null) {
      throw new ConvexError(termsError);
    }

    if (args.coMakerMemberId === ctx.member._id) {
      throw new ConvexError("You cannot be your own co-maker.");
    }

    const coMaker = await ctx.db.get(args.coMakerMemberId);
    if (coMaker === null || !coMaker.active) {
      throw new ConvexError("Select an active member as co-maker.");
    }
    // The paper form states this requirement directly under the signature line.
    if (!coMaker.isPermanent) {
      throw new ConvexError("The co-maker must be in permanent status.");
    }

    // One loan at a time: anything not yet archived is still in flight.
    const existing = await ctx.db
      .query("applications")
      .withIndex("by_member", (q) => q.eq("memberId", ctx.member._id))
      .collect();
    if (existing.some((app) => app.status !== "archived")) {
      throw new ConvexError(
        "You already have a loan application in progress. Wait for it to be released or rejected before filing another.",
      );
    }

    const now = Date.now();
    // Allocated in this same transaction so a failure cannot burn a number.
    const { year, seq, queueNumber } = await nextQueueNumber(ctx, now);

    return await ctx.db.insert("applications", {
      queueNumber,
      year,
      seq,
      memberId: ctx.member._id,
      borrowerName: fullName(ctx.member),
      coMakerMemberId: coMaker._id,
      coMakerName: fullName(coMaker),
      loanType: args.loanType,
      loanAmount: args.loanAmount,
      deductionPerPayday: args.deductionPerPayday,
      termMonths: TERM_MONTHS,
      dateFiled: now, // frozen at submission, never recomputed
      status: "pending",
    });
  },
});

/* -------------------------------------------------------------------------- */
/* Approval state machine                                                     */
/* -------------------------------------------------------------------------- */

export const castDecision = approverMutation({
  args: {
    applicationId: v.id("applications"),
    decision: decisionValidator,
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId);
    if (app === null) {
      throw new ConvexError("Application not found.");
    }

    const role = ctx.member.role as "committee1" | "committee2" | "chair";

    // 1. Stage gate — the chair only sees it after both committee members pass.
    if (role === "chair") {
      if (app.status !== "chair_review") {
        throw new ConvexError(
          "This application is not yet ready for the chair's decision.",
        );
      }
    } else if (app.status !== "pending") {
      throw new ConvexError("Committee voting is already closed.");
    }

    // 2. One vote per role. Convex has no unique constraints, so this check is
    //    the enforcement; a duplicate racing it fails on OCC retry.
    const existing = await ctx.db
      .query("approvals")
      .withIndex("by_application_role", (q) =>
        q.eq("applicationId", app._id).eq("approverRole", role),
      )
      .unique();
    if (existing !== null) {
      throw new ConvexError("You have already recorded a decision.");
    }

    const now = Date.now();
    await ctx.db.insert("approvals", {
      applicationId: app._id,
      approverMemberId: ctx.member._id,
      approverRole: role,
      decision: args.decision,
      remarks: args.remarks,
      decidedAt: now,
    });

    // 3. A rejection is terminal and skips every remaining approver.
    if (args.decision === "rejected") {
      await ctx.db.patch(app._id, {
        status: "archived",
        outcome: "rejected",
        archivedAt: now,
      });
      return;
    }

    // 4. Chair approval fixes the start date once. The spreadsheet used a
    //    volatile TODAY() here, so the date silently moved every day.
    if (role === "chair") {
      await ctx.db.patch(app._id, {
        status: "approved",
        startDate: app.startDate ?? now,
      });
      return;
    }

    // 5. Advance only once both committee members have approved. Recomputed
    //    from the audit rows (the insert above is visible in this transaction)
    //    rather than tracked in a counter, so concurrent votes self-heal: one
    //    retries on conflict and then observes both.
    const votes = await ctx.db
      .query("approvals")
      .withIndex("by_application", (q) => q.eq("applicationId", app._id))
      .collect();
    const approvedRoles = new Set(
      votes.filter((vote) => vote.decision === "approved").map((v) => v.approverRole),
    );
    if (approvedRoles.has("committee1") && approvedRoles.has("committee2")) {
      await ctx.db.patch(app._id, { status: "chair_review" });
    }
  },
});

export const recordRelease = treasurerMutation({
  args: {
    applicationId: v.id("applications"),
    releasedAmount: v.number(),
    releasedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId);
    if (app === null) {
      throw new ConvexError("Application not found.");
    }
    if (app.status !== "approved") {
      throw new ConvexError("Only an approved application can be released.");
    }
    if (args.releasedAmount <= 0) {
      throw new ConvexError("Released amount must be greater than zero.");
    }

    // Release is the last step, so archive in the same move.
    await ctx.db.patch(app._id, {
      status: "archived",
      outcome: "approved",
      releasedAt: args.releasedAt,
      releasedAmount: args.releasedAmount,
      releasedByMemberId: ctx.member._id,
      archivedAt: Date.now(),
    });
  },
});

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

/** The signed-in member's own applications. Never anyone else's. */
export const listMine = memberQuery({
  args: {},
  handler: async (ctx) => {
    const apps = await ctx.db
      .query("applications")
      .withIndex("by_member", (q) => q.eq("memberId", ctx.member._id))
      .collect();
    apps.sort((a, b) => b.seq - a.seq);
    return apps;
  },
});

/**
 * A single application for its owner. Ownership is checked against the
 * authenticated member, never against a client-supplied id.
 */
export const getMine = memberQuery({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId);
    if (app === null || app.memberId !== ctx.member._id) {
      throw new ConvexError("Application not found.");
    }
    return await withApprovals(ctx, app);
  },
});

/** Staff view of one application. */
export const get = staffQuery({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId);
    if (app === null) {
      throw new ConvexError("Application not found.");
    }
    return await withApprovals(ctx, app);
  },
});

/** The live queue: everything still moving through approval. */
export const listQueue = staffQuery({
  args: {},
  handler: async (ctx) => {
    const open = await ctx.db
      .query("applications")
      .filter((q) => q.neq(q.field("status"), "archived"))
      .collect();
    open.sort((a, b) => a.year - b.year || a.seq - b.seq);

    return await Promise.all(open.map((app) => withApprovals(ctx, app)));
  },
});

/** Finished applications — approved and rejected alike, read-only. */
export const listArchive = staffQuery({
  args: {},
  handler: async (ctx) => {
    const archived = await ctx.db
      .query("applications")
      .withIndex("by_status", (q) => q.eq("status", "archived"))
      .collect();
    archived.sort((a, b) => b.year - a.year || b.seq - a.seq);
    return archived;
  },
});

/** Members eligible to stand as co-maker: permanent, active, not yourself. */
export const eligibleCoMakers = memberQuery({
  args: {},
  handler: async (ctx) => {
    const permanent = await ctx.db
      .query("members")
      .withIndex("by_permanent", (q) => q.eq("isPermanent", true).eq("active", true))
      .collect();
    return permanent
      .filter((m) => m._id !== ctx.member._id)
      .map((m) => ({ _id: m._id, name: fullName(m), position: m.position }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

/** Everything the PDF route needs, in one authorised read. */
export async function loadForPrint(
  ctx: QueryCtx,
  applicationId: Id<"applications">,
) {
  const app = await ctx.db.get(applicationId);
  if (app === null) {
    throw new ConvexError("Application not found.");
  }
  return await withApprovals(ctx, app);
}
