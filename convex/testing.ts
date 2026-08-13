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

/**
 * Deletes an auth account so it can be signed up again from scratch. Local
 * recovery only, for when a half-finished seed leaves an unusable password.
 */
export const deleteAuthAccount = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (user === null) return "no such user";

    // Unlink the membership so claimProfile can re-link the new account.
    const member = await ctx.db
      .query("members")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (member !== null) {
      await ctx.db.patch(member._id, { userId: undefined });
    }

    for (const table of ["authAccounts", "authSessions"] as const) {
      const rows = await ctx.db
        .query(table)
        .filter((q) => q.eq(q.field("userId"), user._id))
        .collect();
      await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
    }
    await ctx.db.delete(user._id);
    return `deleted ${email}`;
  },
});

/**
 * Marks a seeded account's email as already confirmed.
 *
 * Seeded people never receive a code — the addresses are fictional, and Resend
 * will not deliver to them anyway until the association verifies its domain.
 * Without this the whole roster is locked out the moment email verification is
 * switched on, which is not a real condition worth reproducing locally.
 */
export const markEmailVerified = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const accounts = await ctx.db.query("authAccounts").collect();
    const account = accounts.find(
      (row) => String(row.providerAccountId).toLowerCase() === email,
    );
    if (account === undefined) return `no account for ${email}`;

    await ctx.db.patch(account._id, { emailVerified: new Date().toISOString() });
    return `verified ${email}`;
  },
});

/** Inspector for local debugging: who exists, and is each account linked? */
export const listMembers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const members = await ctx.db.query("members").collect();
    const users = await ctx.db.query("users").collect();
    return {
      members: members.map((m) => ({
        name: `${m.firstName} ${m.lastName}`,
        email: m.email,
        role: m.role,
        linked: m.userId !== undefined,
      })),
      authAccounts: users.map((u) => u.email ?? "(no email)"),
    };
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
