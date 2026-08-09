export { formatPeso, roleTitle, roleLabel } from "@convex/lib/loan";

/** Dates are rendered in Manila time regardless of where the browser sits. */
const MANILA = "Asia/Manila";

export function formatDate(ms: number | undefined): string {
  if (ms === undefined) return "—";
  return new Date(ms).toLocaleDateString("en-PH", {
    timeZone: MANILA,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(ms: number | undefined): string {
  if (ms === undefined) return "—";
  return new Date(ms).toLocaleString("en-PH", {
    timeZone: MANILA,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** For <input type="date">, which needs YYYY-MM-DD in local terms. */
export function toDateInputValue(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export type Status =
  | "pending"
  | "chair_review"
  | "approved"
  | "released"
  | "archived";

export function statusLabel(
  status: Status,
  outcome?: "approved" | "rejected",
): string {
  switch (status) {
    case "pending":
      return "With the committee";
    case "chair_review":
      return "With the chair";
    case "approved":
      return "For release";
    case "released":
      return "Released";
    // "Disapproved" is the word the form and the decision buttons use; keep
    // one vocabulary across the interface.
    case "archived":
      return outcome === "rejected" ? "Disapproved" : "Released";
  }
}

/** Convex throws ConvexError with a string payload; surface it verbatim. */
export function errorMessage(error: unknown): string {
  if (error !== null && typeof error === "object" && "data" in error) {
    const data = (error as { data: unknown }).data;
    if (typeof data === "string") return data;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
