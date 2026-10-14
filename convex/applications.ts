import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  approverMutation,
  memberMutation,
  memberQuery,
  staffQuery,
  treasurerMutation,
  STAFF_ROLES,
} from "./lib/auth";
import {
  TERM_MONTHS,
  applicationNoun,
  formatPeso,
  isClaim,
  roleTitle,
  validateClaimAmount,
  validateLoanTerms,
} from "./lib/loan";
import { nextQueueNumber } from "./lib/queue";
import { claimTypeValidator, decisionValidator, loanKindValidator } from "./schema";

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

/**
 * One loan and one claim at a time: anything not yet archived is still in
 * flight. The two are counted apart — a member repaying a loan who is then
 * hospitalised must still be able to claim.
 */
async function assertNoneInFlight(
  ctx: MutationCtx,
  member: Doc<"members">,
  kind: "loan" | "claim",
) {
  const existing = await ctx.db
    .query("applications")
    .withIndex("by_member", (q) => q.eq("memberId", member._id))
    .collect();
  const inFlight = existing.some(
    (app) => app.status !== "archived" && applicationNoun(app.loanType) === kind,
  );
  if (inFlight) {
    throw new ConvexError(
      `You already have a ${kind} application in progress. Wait for it to be released or rejected before filing another.`,
    );
  }
}

export const submit = memberMutation({
  args: {
    coMakerMemberId: v.id("members"),
    loanType: loanKindValidator,
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

    await assertNoneInFlight(ctx, ctx.member, "loan");

    const now = Date.now();
    // Allocated in this same transaction so a failure cannot burn a number.
    const { year, seq, queueNumber } = await nextQueueNumber(ctx, now);

    const applicationId = await ctx.db.insert("applications", {
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

    // Scheduled, not awaited: mail cannot reach the network from a mutation,
    // and a mail outage must never stop a loan being filed.
    await ctx.scheduler.runAfter(0, internal.notify.applicationFiled, {
      applicationId,
    });

    return applicationId;
  },
});

/**
 * Files a hospitalization or terminal illness claim.
 *
 * Claims skip the committee entirely, so they are created already at
 * `chair_review`: the chair's decision is the only one, and `castDecision`
 * refuses the committee seats on a claim. Numbered in the claim series.
 */
export const submitClaim = memberMutation({
  args: {
    claimType: claimTypeValidator,
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const amountError = validateClaimAmount(args.amount);
    if (amountError !== null) {
      throw new ConvexError(amountError);
    }

    await assertNoneInFlight(ctx, ctx.member, "claim");

    const now = Date.now();
    // Allocated in this same transaction so a failure cannot burn a number.
    const { year, seq, queueNumber } = await nextQueueNumber(ctx, now, "claim");

    const applicationId = await ctx.db.insert("applications", {
      queueNumber,
      year,
      seq,
      memberId: ctx.member._id,
      borrowerName: fullName(ctx.member),
      loanType: args.claimType,
      loanAmount: args.amount,
      dateFiled: now, // frozen at submission, never recomputed
      status: "chair_review",
    });

    await ctx.scheduler.runAfter(0, internal.notify.applicationFiled, {
      applicationId,
    });

    return applicationId;
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
    const claim = isClaim(app.loanType);

    // Claims are the chair's alone. Checked before anything else so a
    // committee seat cannot leave even an audit row on one.
    if (claim && role !== "chair") {
      throw new ConvexError("Claims are decided by the chair alone.");
    }

    // A disapproval ends the application, so the borrower is owed a reason.
    // Enforced here rather than only in the form: the rule should hold for any
    // caller, and the printed record is worthless without it.
    const remarks = args.remarks?.trim() ?? "";
    if (args.decision === "rejected" && remarks === "") {
      throw new ConvexError(
        "Give a reason for disapproving. The borrower is told why.",
      );
    }

    // 1. Stage gate — the chair only sees a loan after both committee members
    //    pass. A claim is filed straight into `chair_review`.
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
      remarks: remarks === "" ? undefined : remarks,
      decidedAt: now,
    });

    const announce = (nowWith: "committee" | "chair" | "treasurer" | "nobody") =>
      ctx.scheduler.runAfter(0, internal.notify.decisionRecorded, {
        applicationId: app._id,
        decision: args.decision,
        approverName: fullName(ctx.member),
        approverTitle: roleTitle(role),
        remarks: remarks === "" ? undefined : remarks,
        nowWith,
      });

    // 3. A rejection is terminal and skips every remaining approver.
    if (args.decision === "rejected") {
      await ctx.db.patch(app._id, {
        status: "archived",
        outcome: "rejected",
        archivedAt: now,
      });
      await announce("nobody");
      return;
    }

    // 4. Chair approval fixes the start date once. The spreadsheet used a
    //    volatile TODAY() here, so the date silently moved every day. A claim
    //    has no deductions to start, so it gets no start date.
    if (role === "chair") {
      await ctx.db.patch(
        app._id,
        claim
          ? { status: "approved" }
          : { status: "approved", startDate: app.startDate ?? now },
      );
      await announce("treasurer");
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
      await announce("chair");
    } else {
      await announce("committee");
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

    await ctx.scheduler.runAfter(0, internal.notify.loanReleased, {
      applicationId: app._id,
      releasedAmount: formatPeso(args.releasedAmount),
      releasedOn: new Date(args.releasedAt).toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
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
    // By filing date, not `seq`: loans and claims are numbered separately, so
    // their sequence numbers do not interleave.
    apps.sort((a, b) => b.dateFiled - a.dateFiled);
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
    // Filing order across both series; `seq` only orders one series.
    open.sort((a, b) => a.dateFiled - b.dateFiled);

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
    archived.sort((a, b) => b.dateFiled - a.dateFiled);
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
      .map((m) => ({
        _id: m._id,
        name: fullName(m),
        position: m.position,
        // A co-maker on the roster who has never signed up cannot follow the
        // loan they are standing for, so the borrower is told to nudge them.
        registered: m.userId !== undefined,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

/**
 * Everything the printable form needs, in one authorised read.
 *
 * Visible to the borrower and to staff, but only once a decision exists —
 * there is no meaningful form to print before then. Called from the PDF route
 * handler with the caller's own token, so the same rules apply there.
 */
export const getForPrint = memberQuery({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId);
    if (app === null) {
      throw new ConvexError("Application not found.");
    }

    const isOwner = app.memberId === ctx.member._id;
    const isStaff = STAFF_ROLES.includes(ctx.member.role);
    if (!isOwner && !isStaff) {
      throw new ConvexError("Application not found.");
    }
    if (app.status === "pending" || app.status === "chair_review") {
      throw new ConvexError(
        "The form can be printed once the application has been decided.",
      );
    }

    const detail = await withApprovals(ctx, app);
    const releasedBy =
      app.releasedByMemberId === undefined
        ? null
        : await ctx.db.get(app.releasedByMemberId);
    const treasurer = await ctx.db
      .query("members")
      .withIndex("by_role", (q) => q.eq("role", "treasurer"))
      .filter((q) => q.eq(q.field("active"), true))
      .first();

    return {
      ...detail,
      releasedByName: releasedBy === null ? null : fullName(releasedBy),
      treasurerName: treasurer === null ? null : fullName(treasurer),
    };
  },
});
