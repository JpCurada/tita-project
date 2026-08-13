/**
 * Turning a thrown value into something worth showing a person.
 *
 * Two kinds of error reach the client, and they must be treated differently:
 *
 *   - `ConvexError` carries a `data` payload we wrote ourselves. It is a rule
 *     the person can act on ("Give a reason for disapproving"), so it is shown
 *     verbatim.
 *
 *   - Anything else is a fault: a bug, a network drop, or a library throwing a
 *     plain Error. Convex wraps those with a request id and the literal words
 *     "Server Error", which tells the reader nothing and looks alarming. Those
 *     are replaced with plain language and logged for us instead.
 *
 * The previous version fell back to `error.message`, which is why sign-up
 * showed "[Request ID: …] Server Error Uncaught Error: Account … already
 * exists" instead of "An account already exists for that email address."
 */

/** A rule we wrote, meant to be read by the person who hit it. */
export function isRuleViolation(error: unknown): error is { data: string } {
  return (
    error !== null &&
    typeof error === "object" &&
    "data" in error &&
    typeof (error as { data: unknown }).data === "string"
  );
}

/**
 * Known faults from libraries that throw plain Errors, matched on their text
 * because that is all they give us. Each maps to something the reader can act
 * on. Order matters: the first match wins.
 */
const KNOWN_FAULTS: { match: RegExp; message: string }[] = [
  {
    match: /already exists/i,
    message:
      "An account already exists for that email address. Sign in instead, or reset your password if you have forgotten it.",
  },
  {
    // "Invalid credentials" is what @convex-dev/auth throws for both a wrong
    // password and an address with no account. Saying which would tell an
    // attacker whether an address is registered, so the message covers both.
    match: /invalid credentials|invalid password|incorrect password|invalidsecret/i,
    message:
      "That email and password do not match. Check for typos, or reset your password.",
  },
  {
    match: /invalid.*code|code.*invalid|expired/i,
    message: "That code is wrong or has expired. Ask for a new one.",
  },
  {
    match: /could not send|resend refused/i,
    message:
      "We could not send that email. Check the address, or try again shortly.",
  },
  {
    match: /rate.?limit|too many/i,
    message: "Too many attempts. Wait a few minutes and try again.",
  },
  {
    match: /network|failed to fetch|offline/i,
    message: "We could not reach the server. Check your connection and retry.",
  },
];

/**
 * The message to show. `fallback` lets a caller say what the person was trying
 * to do, which is more use than a generic apology.
 */
export function toUserMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (isRuleViolation(error)) {
    return error.data;
  }

  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  for (const fault of KNOWN_FAULTS) {
    if (fault.match.test(raw)) return fault.message;
  }

  // Unrecognised: keep the detail out of the interface, but not out of reach.
  if (raw !== "") {
    console.error("Unhandled error surfaced to the user:", error);
  }
  return fallback;
}
