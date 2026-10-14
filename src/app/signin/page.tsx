import type { Metadata } from "next";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign in — PIT Faculty Association",
};

/**
 * Read on the server so "Create an account" from the landing page opens on
 * the right step at first paint, with no flash of the sign-in heading.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  return <SignInForm initialFlow={mode === "signup" ? "signUp" : "signIn"} />;
}
