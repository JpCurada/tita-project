import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { chairMutation, chairQuery, type Role } from "./lib/auth";
import { roleTitle } from "./lib/loan";
import { fullName } from "./applications";
import { roleValidator } from "./schema";

/**
 * The one query that must not throw for a signed-up user with no profile —
 * the app uses a null result to route them to /pending-approval.
 */
export const getCurrentMember = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const member = await ctx.db
      .query("members")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (member === null || !member.active) {
      return null;
    }
    return { ...member, name: fullName(member) };
  },
});

/**
 * Links a freshly signed-up user to a profile the chair pre-created for their
 * email address. Called once after sign-in; a no-op when already linked.
 */
export const claimProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Not authenticated.");
    }

    const alreadyLinked = await ctx.db
      .query("members")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (alreadyLinked !== null) {
      return alreadyLinked._id;
    }

    const user = await ctx.db.get(userId);
    if (user === null || typeof user.email !== "string") {
      return null;
    }

    const pending = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", user.email as string))
      .unique();
    // Only an unclaimed profile can be linked, so a second account with the
    // same email cannot take over someone else's membership.
    if (pending === null || pending.userId !== undefined) {
      return null;
    }

    await ctx.db.patch(pending._id, { userId });
    return pending._id;
  },
});

export const list = chairQuery({
  args: {},
  handler: async (ctx) => {
    const members = await ctx.db.query("members").collect();
    return members
      .map((m) => ({ ...m, name: fullName(m), linked: m.userId !== undefined }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const create = chairMutation({
  args: {
    employeeNo: v.string(),
    firstName: v.string(),
    middleName: v.optional(v.string()),
    lastName: v.string(),
    email: v.string(),
    position: v.optional(v.string()),
    isPermanent: v.boolean(),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    const byEmail = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (byEmail !== null) {
      throw new ConvexError("A member with that email already exists.");
    }
    const byEmployeeNo = await ctx.db
      .query("members")
      .withIndex("by_employeeNo", (q) => q.eq("employeeNo", args.employeeNo))
      .unique();
    if (byEmployeeNo !== null) {
      throw new ConvexError("A member with that employee number already exists.");
    }

    await assertRoleIsFree(ctx, args.role);

    return await ctx.db.insert("members", {
      employeeNo: args.employeeNo.trim(),
      firstName: args.firstName.trim(),
      middleName: args.middleName?.trim() || undefined,
      lastName: args.lastName.trim(),
      email,
      position: args.position?.trim() || undefined,
      isPermanent: args.isPermanent,
      role: args.role,
      active: true,
    });
  },
});

/**
 * Adds many members at once, from a pasted list.
 *
 * Rows are independent: a bad row is reported and skipped rather than failing
 * the batch, so the chair can paste a whole roster, fix the few rows that were
 * rejected, and paste again. Re-pasting is safe — rows that already exist are
 * reported as duplicates, not inserted twice.
 *
 * Everyone imported this way is an ordinary borrower; committee seats are
 * assigned afterwards on the Members screen, where the one-per-seat rule
 * applies.
 */
export const createMany = chairMutation({
  args: {
    rows: v.array(
      v.object({
        employeeNo: v.string(),
        firstName: v.string(),
        middleName: v.optional(v.string()),
        lastName: v.string(),
        email: v.string(),
        position: v.optional(v.string()),
        isPermanent: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const added: string[] = [];
    const skipped: { row: number; name: string; reason: string }[] = [];

    // Guards against duplicates inside the pasted batch itself, which the
    // database cannot catch because none of them are committed yet.
    const seenEmails = new Set<string>();
    const seenEmployeeNos = new Set<string>();

    for (const [index, row] of args.rows.entries()) {
      const rowNumber = index + 1;
      const email = row.email.trim().toLowerCase();
      const employeeNo = row.employeeNo.trim();
      const name = `${row.firstName.trim()} ${row.lastName.trim()}`.trim();

      if (row.firstName.trim() === "" || row.lastName.trim() === "") {
        skipped.push({ row: rowNumber, name: name || email, reason: "Missing name" });
        continue;
      }
      if (!email.includes("@")) {
        skipped.push({ row: rowNumber, name, reason: "Invalid email" });
        continue;
      }
      if (employeeNo === "") {
        skipped.push({ row: rowNumber, name, reason: "Missing employee number" });
        continue;
      }
      if (seenEmails.has(email) || seenEmployeeNos.has(employeeNo)) {
        skipped.push({ row: rowNumber, name, reason: "Repeated in this list" });
        continue;
      }

      const byEmail = await ctx.db
        .query("members")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (byEmail !== null) {
        skipped.push({ row: rowNumber, name, reason: "Email already on the roll" });
        continue;
      }
      const byEmployeeNo = await ctx.db
        .query("members")
        .withIndex("by_employeeNo", (q) => q.eq("employeeNo", employeeNo))
        .unique();
      if (byEmployeeNo !== null) {
        skipped.push({
          row: rowNumber,
          name,
          reason: "Employee number already on the roll",
        });
        continue;
      }

      await ctx.db.insert("members", {
        employeeNo,
        firstName: row.firstName.trim(),
        middleName: row.middleName?.trim() || undefined,
        lastName: row.lastName.trim(),
        email,
        position: row.position?.trim() || undefined,
        isPermanent: row.isPermanent,
        role: "member",
        active: true,
      });

      seenEmails.add(email);
      seenEmployeeNos.add(employeeNo);
      added.push(name);
    }

    return { added, skipped };
  },
});

export const setRole = chairMutation({
  args: { memberId: v.id("members"), role: roleValidator },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (member === null) {
      throw new ConvexError("Member not found.");
    }
    if (member.role === args.role) {
      return;
    }
    // Guard against the chair demoting themselves and leaving no chair.
    if (member.role === "chair" && args.role !== "chair") {
      throw new ConvexError(
        "Appoint another chair first — the association must always have one.",
      );
    }
    await assertRoleIsFree(ctx, args.role);
    await ctx.db.patch(args.memberId, { role: args.role });
  },
});

export const setActive = chairMutation({
  args: { memberId: v.id("members"), active: v.boolean() },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (member === null) {
      throw new ConvexError("Member not found.");
    }
    if (member._id === ctx.member._id && !args.active) {
      throw new ConvexError("You cannot deactivate your own account.");
    }
    await ctx.db.patch(args.memberId, { active: args.active });
  },
});

/**
 * Committee posts are singular: one Committee Member 1, one Committee Member 2,
 * one Chair, one Treasurer. `member` is unrestricted.
 */
async function assertRoleIsFree(ctx: MutationCtx, role: Role) {
  if (role === "member") {
    return;
  }
  const holder = await ctx.db
    .query("members")
    .withIndex("by_role", (q) => q.eq("role", role))
    .filter((q) => q.eq(q.field("active"), true))
    .first();
  if (holder !== null) {
    throw new ConvexError(
      `${roleTitle(role)} is already assigned to ${holder.firstName} ${holder.lastName}. Reassign them first.`,
    );
  }
}

/**
 * Creates the very first chair, resolving the chicken-and-egg problem: without
 * a chair nobody can onboard anyone. Run from the CLI:
 *
 *   npx convex run members:bootstrapChair '{"email":"chair@pit.edu.ph", ...}'
 *
 * An `internalMutation` is not part of the public API, so no browser can reach
 * it, and the existing-chair guard makes it self-disabling after first use.
 */
export const bootstrapChair = internalMutation({
  args: {
    email: v.string(),
    employeeNo: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    const existingChair = await ctx.db
      .query("members")
      .withIndex("by_role", (q) => q.eq("role", "chair"))
      .first();
    if (existingChair !== null) {
      throw new ConvexError(
        "A chair already exists. Use the Members screen to make changes.",
      );
    }

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (user === null) {
      throw new ConvexError(
        `No account for ${email}. Sign up in the app with that address first, then re-run this.`,
      );
    }

    return await ctx.db.insert("members", {
      userId: user._id,
      employeeNo: args.employeeNo,
      firstName: args.firstName,
      lastName: args.lastName,
      email,
      isPermanent: true,
      role: "chair",
      active: true,
    });
  },
});
