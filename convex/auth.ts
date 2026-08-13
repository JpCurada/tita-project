import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";
import { ResendOTPSignUp } from "./ResendOTPSignUp";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // Emails are stored lower-cased so a profile the chair pre-created
      // matches however the member types their address.
      profile(params) {
        return { email: String(params.email ?? "").trim().toLowerCase() };
      },
      /**
       * Sign-up verification is off until the association verifies its domain
       * with Resend. Until then Resend refuses every recipient except the
       * account owner, so requiring a code would lock out every member with a
       * pit.edu.ph address — the roster is already the real gate on access, so
       * that trade is not worth making.
       *
       * Turn it on once the domain is verified:
       *   npx convex env set AUTH_REQUIRE_EMAIL_VERIFICATION true
       */
      verify:
        process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true"
          ? ResendOTPSignUp
          : undefined,
      reset: ResendOTPPasswordReset,
    }),
  ],
});
