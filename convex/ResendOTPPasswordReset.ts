import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";

/**
 * Sends a one-time code by email so a member can set a new password.
 *
 * A short numeric code rather than a magic link: members read this on a phone
 * and often open mail in a different app from the browser they signed in with,
 * where a link would land them in a session that is not theirs. A code can be
 * carried across by hand.
 *
 * The API key lives on the Convex deployment, not in the repository:
 *
 *   npx convex env set AUTH_RESEND_KEY re_xxxxxxxx
 *   npx convex env set AUTH_EMAIL_FROM "PIT FA Loans <onboarding@resend.dev>"
 */
export const ResendOTPPasswordReset = Resend({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,

  async generateVerificationToken() {
    // 8 digits from the platform CSPRNG. Rejection sampling keeps every digit
    // equally likely, which a bare modulo would not.
    const digits = new Uint8Array(8);
    crypto.getRandomValues(digits);
    let code = "";
    for (let i = 0; i < digits.length; i++) {
      let value = digits[i];
      while (value >= 250) {
        const replacement = new Uint8Array(1);
        crypto.getRandomValues(replacement);
        value = replacement[0];
      }
      code += String(value % 10);
    }
    return code;
  },

  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      // Until the association verifies its own domain with Resend, this must
      // stay on resend.dev — Resend refuses to send from an unverified sender.
      from: process.env.AUTH_EMAIL_FROM ?? "PIT FA Loans <onboarding@resend.dev>",
      to: [email],
      subject: "Your password reset code",
      text: [
        "Someone asked to reset the password for this PIT Faculty Association",
        "loan account.",
        "",
        `Your code is ${token}`,
        "",
        "Enter it on the reset screen within the next hour. If you did not ask",
        "for this, you can ignore this message — your password has not changed.",
      ].join("\n"),
    });
    if (error) {
      throw new Error(
        `Could not send the reset email: ${JSON.stringify(error)}`,
      );
    }
  },
});
