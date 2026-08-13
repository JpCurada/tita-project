import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { formatPeso } from "./lib/loan";

/**
 * Everything an outgoing email needs about one application, gathered in a
 * single read. Kept out of notify.ts because that file runs in Node and cannot
 * touch the database directly.
 *
 * Amounts and dates are formatted here so the wording is identical to the
 * screens the committee already reads.
 */
export const forApplication = internalQuery({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId);
    if (app === null) return null;

    const borrower = await ctx.db.get(app.memberId);

    const emailsFor = async (role: "committee1" | "committee2" | "chair" | "treasurer") => {
      const holder = await ctx.db
        .query("members")
        .withIndex("by_role", (q) => q.eq("role", role))
        .filter((q) => q.eq(q.field("active"), true))
        .first();
      // Only people who have actually signed up can receive anything useful,
      // but the address is on the roster either way.
      return holder === null ? [] : [holder.email];
    };

    const manila = (ms: number) =>
      new Date(ms).toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    return {
      queueNumber: app.queueNumber,
      borrowerName: app.borrowerName,
      borrowerEmail: borrower?.email ?? "",
      coMakerName: app.coMakerName,
      amount: formatPeso(app.loanAmount),
      deduction: `${formatPeso(app.deductionPerPayday)} × 10 paydays`,
      dateFiled: manila(app.dateFiled),
      committeeEmails: [
        ...(await emailsFor("committee1")),
        ...(await emailsFor("committee2")),
      ],
      chairEmails: await emailsFor("chair"),
      treasurerEmails: await emailsFor("treasurer"),
    };
  },
});
