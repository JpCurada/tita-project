"use node";

import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { createAccount, modifyAccountCredentials } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { roleValidator } from "./schema";

/**
 * Creates a working account — credentials and membership together — for someone
 * who cannot be asked to register first.
 *
 * The committee has to exist before the association can use the system at all,
 * and `bootstrapChair` only promotes an account that already exists, so setting
 * up the committee otherwise means chasing three people through a sign-up form
 * before anything can be tested.
 *
 * This is an `internalAction`: unreachable from any browser, runnable only by
 * someone holding a deploy key. It is an action rather than a mutation because
 * password hashing runs through the auth provider, which mutations cannot call.
 *
 *   npx convex run provision:account '{"email":"...","password":"...", ...}' --prod
 *
 * The password set here is temporary by intention — hand it over in person and
 * have the holder change it from the sign-in screen's "Forgot password?".
 */
export const account = internalAction({
  args: {
    email: v.string(),
    password: v.string(),
    firstName: v.string(),
    middleName: v.optional(v.string()),
    lastName: v.string(),
    employeeNo: v.string(),
    position: v.optional(v.string()),
    role: roleValidator,
    isPermanent: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<string> => {
    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) {
      throw new ConvexError(`"${args.email}" is not an email address.`);
    }
    if (args.password.length < 8) {
      throw new ConvexError("The password must be at least 8 characters.");
    }

    // Reuse the account if it already exists, so re-running this to fix a typo
    // in someone's name does not fail on the credentials.
    const existing = await ctx.runQuery(internal.provisioning.findUserByEmail, {
      email,
    });

    let userId = existing?.userId ?? null;
    if (userId === null) {
      const created = await createAccount(ctx, {
        provider: "password",
        account: { id: email, secret: args.password },
        profile: { email },
        shouldLinkViaEmail: false,
        shouldLinkViaPhone: false,
      });
      userId = created.user._id as string;
    } else {
      // Known account: reset the secret so the handed-over password is the one
      // that works, whatever it was before.
      await modifyAccountCredentials(ctx, {
        provider: "password",
        account: { id: email, secret: args.password },
      });
    }

    // Confirm the address outright. Nobody can collect a code for an account
    // they did not create, and the committee cannot wait on mail that Resend
    // will not deliver until the domain is verified.
    await ctx.runMutation(internal.provisioning.finish, {
      userId,
      email,
      firstName: args.firstName,
      middleName: args.middleName,
      lastName: args.lastName,
      employeeNo: args.employeeNo,
      position: args.position,
      role: args.role,
      isPermanent: args.isPermanent ?? true,
    });

    return `${email} is ready as ${args.role}`;
  },
});
