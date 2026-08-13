import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { roleValidator } from "./schema";

/**
 * Database half of `provision:account`. Kept separate because that file runs in
 * Node and cannot reach the database directly.
 */

export const findUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
    return user === null ? null : { userId: user._id as string };
  },
});

/**
 * Marks the address confirmed and writes the membership.
 *
 * Confirming outright is safe here: only a deploy-key holder can reach this,
 * and the alternative is a code the association cannot receive until its domain
 * is verified with Resend.
 */
export const finish = internalMutation({
  args: {
    userId: v.string(),
    email: v.string(),
    firstName: v.string(),
    middleName: v.optional(v.string()),
    lastName: v.string(),
    employeeNo: v.string(),
    position: v.optional(v.string()),
    role: roleValidator,
    isPermanent: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = ctx.db.normalizeId("users", args.userId);
    if (userId === null) {
      throw new ConvexError("That user no longer exists.");
    }

    // Confirm the email so sign-in works even with verification switched on.
    const accounts = await ctx.db.query("authAccounts").collect();
    const account = accounts.find(
      (row) => String(row.providerAccountId).toLowerCase() === args.email,
    );
    if (account !== undefined && account.emailVerified === undefined) {
      await ctx.db.patch(account._id, {
        emailVerified: new Date().toISOString(),
      });
    }

    // A committee seat is held by one person at a time. Standing aside anyone
    // who holds the seat already keeps that rule true, rather than failing and
    // leaving the account half-made.
    if (args.role !== "member") {
      const holders = await ctx.db
        .query("members")
        .withIndex("by_role", (q) => q.eq("role", args.role))
        .collect();
      for (const holder of holders) {
        if (holder.email !== args.email) {
          await ctx.db.patch(holder._id, { role: "member" });
        }
      }
    }

    const fields = {
      userId,
      employeeNo: args.employeeNo.trim(),
      firstName: args.firstName.trim(),
      middleName: args.middleName?.trim() || undefined,
      lastName: args.lastName.trim(),
      email: args.email,
      position: args.position?.trim() || undefined,
      isPermanent: args.isPermanent,
      role: args.role,
      active: true,
    };

    const existing = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing !== null) {
      await ctx.db.patch(existing._id, fields);
      return existing._id;
    }
    return await ctx.db.insert("members", fields);
  },
});
