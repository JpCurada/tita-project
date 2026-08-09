import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * Roles. `member` is the default for faculty; the rest are the committee posts.
 * Only committee1 / committee2 / chair may cast an approval decision — the
 * treasurer records the release but never votes.
 */
export const roleValidator = v.union(
  v.literal("member"),
  v.literal("committee1"),
  v.literal("committee2"),
  v.literal("chair"),
  v.literal("treasurer"),
);

export const approverRoleValidator = v.union(
  v.literal("committee1"),
  v.literal("committee2"),
  v.literal("chair"),
);

/** Where the application sits in its lifecycle. */
export const statusValidator = v.union(
  v.literal("pending"),
  v.literal("chair_review"),
  v.literal("approved"),
  v.literal("released"),
  v.literal("archived"),
);

/**
 * The terminal verdict, kept separate from `status` so archiving a rejected
 * application does not erase the fact that it was rejected.
 */
export const outcomeValidator = v.union(
  v.literal("approved"),
  v.literal("rejected"),
);

export const decisionValidator = v.union(
  v.literal("approved"),
  v.literal("rejected"),
);

export const loanTypeValidator = v.union(
  v.literal("regular"),
  v.literal("emergency"),
);

export default defineSchema({
  ...authTables,

  /**
   * Domain profile for a faculty member. Kept separate from the auth-owned
   * `users` table so the chair can pre-create a member before that person has
   * ever signed up (`userId` stays undefined until they do).
   */
  members: defineTable({
    userId: v.optional(v.id("users")),
    employeeNo: v.string(),
    firstName: v.string(),
    middleName: v.optional(v.string()),
    lastName: v.string(),
    email: v.string(),
    position: v.optional(v.string()),
    isPermanent: v.boolean(),
    role: roleValidator,
    active: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"])
    .index("by_employeeNo", ["employeeNo"])
    .index("by_role", ["role"])
    .index("by_permanent", ["isPermanent", "active"]),

  applications: defineTable({
    queueNumber: v.string(), // "26-0007" — assigned once, never recomputed
    year: v.number(),
    seq: v.number(),
    memberId: v.id("members"),
    borrowerName: v.string(), // denormalised: the name as filed
    coMakerMemberId: v.id("members"),
    coMakerName: v.string(),
    loanType: loanTypeValidator,
    loanAmount: v.number(),
    deductionPerPayday: v.number(),
    termMonths: v.number(),
    dateFiled: v.number(),
    startDate: v.optional(v.number()), // set once, on chair approval
    status: statusValidator,
    outcome: v.optional(outcomeValidator),
    releasedAt: v.optional(v.number()),
    releasedAmount: v.optional(v.number()),
    releasedByMemberId: v.optional(v.id("members")),
    archivedAt: v.optional(v.number()),
  })
    .index("by_member", ["memberId"])
    .index("by_status", ["status"])
    .index("by_queueNumber", ["queueNumber"])
    .index("by_year_seq", ["year", "seq"])
    .index("by_status_year_seq", ["status", "year", "seq"])
    .index("by_coMaker", ["coMakerMemberId"]),

  /** Append-only audit trail: one row per approver decision. */
  approvals: defineTable({
    applicationId: v.id("applications"),
    approverMemberId: v.id("members"),
    approverRole: approverRoleValidator,
    decision: decisionValidator,
    remarks: v.optional(v.string()),
    decidedAt: v.number(),
  })
    .index("by_application", ["applicationId"])
    .index("by_application_role", ["applicationId", "approverRole"]),

  /** Per-year sequence for queue numbers. See convex/lib/queue.ts. */
  counters: defineTable({
    year: v.number(),
    lastSeq: v.number(),
  }).index("by_year", ["year"]),
});
