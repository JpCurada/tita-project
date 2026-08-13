"use node";

import { Resend } from "resend";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

/**
 * Outgoing mail.
 *
 * Convex mutations cannot reach the network, so every notification is scheduled
 * from the mutation that caused it and sent here. That also means a mail
 * failure can never roll back a decision — the loan record is the source of
 * truth, and the email is a courtesy on top of it.
 */

const FROM =
  process.env.AUTH_EMAIL_FROM ?? "PIT FA Loans <onboarding@resend.dev>";

async function send(
  to: string[],
  subject: string,
  lines: string[],
): Promise<void> {
  const key = process.env.AUTH_RESEND_KEY;
  if (key === undefined || key === "") {
    // Not configured yet. Log and carry on rather than throwing: the committee
    // should still be able to work before mail is set up.
    console.warn(`AUTH_RESEND_KEY not set — skipped "${subject}" to ${to.join(", ")}`);
    return;
  }
  const recipients = to.filter((address) => address.trim() !== "");
  if (recipients.length === 0) return;

  const { error } = await new Resend(key).emails.send({
    from: FROM,
    to: recipients,
    subject,
    text: [...lines, "", "— PIT Faculty Association, Loan Committee"].join("\n"),
  });

  if (error !== null) {
    const detail = JSON.stringify(error);
    // Resend refuses unknown recipients until a domain is verified. Retrying
    // will never succeed, so log it once and let the loan carry on — the queue
    // and dashboard already show everything these messages would have said.
    if (/only send testing emails|invalid `?to`? field|not verified/i.test(detail)) {
      console.warn(
        `Email is not configured, so "${subject}" was not sent to ` +
          `${recipients.join(", ")}. Verify a domain at resend.com/domains ` +
          `and set AUTH_EMAIL_FROM to enable notifications.`,
      );
      return;
    }
    // A genuine outage. Thrown so the scheduler retries.
    throw new Error(`Resend refused "${subject}": ${detail}`);
  }
}

/** A new application has been filed: tell the two committee members. */
export const applicationFiled = internalAction({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const details = await ctx.runQuery(internal.notifications.forApplication, {
      applicationId: args.applicationId,
    });
    if (details === null) return;

    await send(
      details.committeeEmails,
      `New loan application ${details.queueNumber} — ${details.borrowerName}`,
      [
        `${details.borrowerName} filed a loan application.`,
        "",
        `Loan number:  ${details.queueNumber}`,
        `Amount:       ${details.amount}`,
        `Per payday:   ${details.deduction}`,
        `Co-maker:     ${details.coMakerName}`,
        `Filed:        ${details.dateFiled}`,
        "",
        "It is waiting for your decision, and the chair's once both",
        "committee members have approved.",
      ],
    );
  },
});

/** A decision has been recorded: tell the borrower, and whoever is next. */
export const decisionRecorded = internalAction({
  args: {
    applicationId: v.id("applications"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    approverName: v.string(),
    approverTitle: v.string(),
    remarks: v.optional(v.string()),
    nowWith: v.union(
      v.literal("committee"),
      v.literal("chair"),
      v.literal("treasurer"),
      v.literal("nobody"),
    ),
  },
  handler: async (ctx, args) => {
    const details = await ctx.runQuery(internal.notifications.forApplication, {
      applicationId: args.applicationId,
    });
    if (details === null) return;

    const heading = `Loan ${details.queueNumber} — ${
      args.decision === "approved" ? "approved" : "disapproved"
    } by the ${args.approverTitle.toLowerCase()}`;

    const body = [
      `${args.approverTitle} ${args.approverName} ${
        args.decision === "approved" ? "approved" : "disapproved"
      } loan ${details.queueNumber} for ${details.borrowerName}.`,
    ];

    if (args.remarks !== undefined && args.remarks !== "") {
      body.push("", `Reason given: ${args.remarks}`);
    }

    body.push("", nextStepLine(args.decision, args.nowWith));

    // The borrower always hears. Whoever must act next hears as well.
    const to = [details.borrowerEmail];
    if (args.decision === "approved") {
      if (args.nowWith === "chair") to.push(...details.chairEmails);
      if (args.nowWith === "treasurer") to.push(...details.treasurerEmails);
    }

    await send([...new Set(to)], heading, body);
  },
});

/** The loan has been paid out. */
export const loanReleased = internalAction({
  args: {
    applicationId: v.id("applications"),
    releasedAmount: v.string(),
    releasedOn: v.string(),
  },
  handler: async (ctx, args) => {
    const details = await ctx.runQuery(internal.notifications.forApplication, {
      applicationId: args.applicationId,
    });
    if (details === null) return;

    await send(
      [details.borrowerEmail],
      `Loan ${details.queueNumber} released`,
      [
        `Your loan ${details.queueNumber} has been released.`,
        "",
        `Amount released:  ${args.releasedAmount}`,
        `Date released:    ${args.releasedOn}`,
        "",
        "Your application is now filed in the archive, and the printable",
        "form is available from your loan record.",
      ],
    );
  },
});

function nextStepLine(
  decision: "approved" | "rejected",
  nowWith: "committee" | "chair" | "treasurer" | "nobody",
): string {
  if (decision === "rejected") {
    return "The application is closed. You may file a new one.";
  }
  switch (nowWith) {
    case "committee":
      return "It still needs the other committee member's decision.";
    case "chair":
      return "It now goes to the Chair of the Loan Committee.";
    case "treasurer":
      return "It is approved, and now waits with the treasurer for release.";
    default:
      return "No further decisions are needed.";
  }
}
