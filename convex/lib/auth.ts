import { getAuthUserId } from "@convex-dev/auth/server";
import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";

export type Role = Doc<"members">["role"];

/** Everyone who may see the full queue (read-only for the treasurer). */
export const STAFF_ROLES: Role[] = [
  "committee1",
  "committee2",
  "chair",
  "treasurer",
];

/**
 * Roles that may cast an approval decision. The treasurer is deliberately
 * absent: they record the release, they do not vote.
 */
export const APPROVER_ROLES: Role[] = ["committee1", "committee2", "chair"];

/**
 * Resolves the signed-in user to their member profile.
 *
 * Throws when there is no profile: a user can exist in `users` (they signed up)
 * before the chair has onboarded them. The UI routes that case to
 * /pending-approval by calling `getCurrentMember`, which returns null instead.
 */
export async function requireMember(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"members">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError("Not authenticated.");
  }
  const member = await ctx.db
    .query("members")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (member === null) {
    throw new ConvexError(
      "No member profile yet. Ask the Loan Committee chair to onboard you.",
    );
  }
  if (!member.active) {
    throw new ConvexError("This account has been deactivated.");
  }
  return member;
}

export function requireRole(
  member: Doc<"members">,
  roles: Role[],
): Doc<"members"> {
  if (!roles.includes(member.role)) {
    throw new ConvexError("You are not allowed to perform this action.");
  }
  return member;
}

/**
 * The wrappers below are the real authorisation boundary. Middleware cannot
 * read roles (it has no database access) and layout checks are only UX, so
 * every function that touches loan data is built from one of these.
 */

/** Any signed-in member with a profile. */
export const memberQuery = customQuery(
  query,
  customCtx(async (ctx) => ({ member: await requireMember(ctx) })),
);

export const memberMutation = customMutation(
  mutation,
  customCtx(async (ctx) => ({ member: await requireMember(ctx) })),
);

/** Committee/chair/treasurer: may read every application. */
export const staffQuery = customQuery(
  query,
  customCtx(async (ctx) => ({
    member: requireRole(await requireMember(ctx), STAFF_ROLES),
  })),
);

/** Committee 1, Committee 2 and Chair only: may cast a decision. */
export const approverMutation = customMutation(
  mutation,
  customCtx(async (ctx) => ({
    member: requireRole(await requireMember(ctx), APPROVER_ROLES),
  })),
);

export const chairMutation = customMutation(
  mutation,
  customCtx(async (ctx) => ({
    member: requireRole(await requireMember(ctx), ["chair"]),
  })),
);

export const chairQuery = customQuery(
  query,
  customCtx(async (ctx) => ({
    member: requireRole(await requireMember(ctx), ["chair"]),
  })),
);

/** Recording a release: treasurer, or the chair acting in their stead. */
export const treasurerMutation = customMutation(
  mutation,
  customCtx(async (ctx) => ({
    member: requireRole(await requireMember(ctx), ["treasurer", "chair"]),
  })),
);
