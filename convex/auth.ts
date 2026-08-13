import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // Emails are stored lower-cased so a profile the chair pre-created
      // matches however the member types their address.
      profile(params) {
        return { email: String(params.email ?? "").trim().toLowerCase() };
      },
      reset: ResendOTPPasswordReset,
    }),
  ],
});
