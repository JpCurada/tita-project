import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { nextQueueNumber } from "./lib/queue";
import { roleValidator } from "./schema";

/**
 * Helpers used only by scripts/verify.mjs. These are `internal*` functions, so
 * they are not part of the public API and no browser can reach them. They exist
 * to exercise the real mutations against a real deployment without standing up
 * five password accounts.
 */

export const reset = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const table of [
      "approvals",
      "applications",
      "counters",
      "members",
    ] as const) {
      const rows = await ctx.db.query(table).collect();
      await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
    }
  },
});

export const seedMember = internalMutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    role: roleValidator,
    isPermanent: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("members", {
      employeeNo: `E-${Math.random().toString(36).slice(2, 8)}`,
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      isPermanent: args.isPermanent,
      role: args.role,
      active: true,
    });
  },
});

/** Allocates queue numbers without inserting applications, to test the counter. */
export const allocateQueueNumbers = internalMutation({
  args: { count: v.number() },
  handler: async (ctx, args) => {
    const issued: string[] = [];
    for (let i = 0; i < args.count; i++) {
      const { queueNumber } = await nextQueueNumber(ctx, Date.now());
      issued.push(queueNumber);
    }
    return issued;
  },
});

/** One allocation per call, so concurrent calls exercise OCC retries. */
export const allocateOne = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { queueNumber } = await nextQueueNumber(ctx, Date.now());
    return queueNumber;
  },
});

export const getApplication = internalQuery({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId);
    if (app === null) return null;
    const approvals = await ctx.db
      .query("approvals")
      .withIndex("by_application", (q) => q.eq("applicationId", app._id))
      .collect();
    return { ...app, approvalCount: approvals.length };
  },
});
