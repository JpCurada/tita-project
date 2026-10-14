import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";

/**
 * Proves an address works before the account is usable.
 *
 * Notifications are the reason this matters: once a loan is filed, decisions
 * are emailed to the borrower. An address nobody checked means a member
 * silently stops hearing about their own application.
 *
 * Shares the shape of ResendOTPPasswordReset, and the same deployment
 * variables:
 *
 *   npx convex env set AUTH_RESEND_KEY re_xxxxxxxx
 *   npx convex env set AUTH_EMAIL_FROM "PIT Faculty Association <onboarding@resend.dev>"
 */
export const ResendOTPSignUp = Resend({
  id: "resend-otp-signup",
  apiKey: process.env.AUTH_RESEND_KEY,

  async generateVerificationToken() {
    // Rejection sampling keeps every digit equally likely; a bare modulo of a
    // random byte would favour the low digits.
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    let code = "";
    for (let i = 0; i < bytes.length; i++) {
      let value = bytes[i];
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
      from: process.env.AUTH_EMAIL_FROM ?? "PIT Faculty Association <onboarding@resend.dev>",
      to: [email],
      subject: "Confirm your email address",
      text: [
        "Someone created a PIT Faculty Association account with this",
        "address.",
        "",
        `Your confirmation code is ${token}`,
        "",
        "Enter it on the sign-up screen within the next hour. If this was not",
        "you, ignore this message. No account can be used without the code.",
      ].join("\n"),
    });
    if (error) {
      // Resend refuses every recipient but the account owner until a domain is
      // verified. That reads as a mail outage otherwise, so name it: the fix is
      // a DNS change, not a retry.
      const detail = JSON.stringify(error);
      if (/only send testing emails/i.test(detail)) {
        throw new Error(
          "EMAIL_NOT_CONFIGURED: this deployment can only send to the Resend " +
            "account owner. Verify a domain at resend.com/domains and set " +
            "AUTH_EMAIL_FROM, or switch off AUTH_REQUIRE_EMAIL_VERIFICATION.",
        );
      }
      throw new Error(`Could not send the email: ${detail}`);
    }
  },
});
