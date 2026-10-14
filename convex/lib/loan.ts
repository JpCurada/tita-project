/**
 * Loan business rules, shared by the submission mutation and the UI.
 *
 * The source spreadsheet offered amounts {6000, 12000, 18000} and deductions
 * {600, 1200, 1800} as two independent dropdowns, so nothing stopped a user
 * pairing 6000 with 1800. The form text ("payable within five (5) months to be
 * deducted every quincena") fixes the real rule: 5 months x 2 quincenas = 10
 * payments, so deduction is always amount / 10.
 */

/**
 * Explicit pairing table rather than a division check — comparing
 * `amount / deduction === 10` invites float surprises, and an exception for a
 * future amount is one line here.
 */
export const AMOUNT_TO_DEDUCTION: Record<number, number> = {
  6000: 600,
  12000: 1200,
  18000: 1800,
};

export const LOAN_AMOUNTS = Object.keys(AMOUNT_TO_DEDUCTION)
  .map(Number)
  .sort((a, b) => a - b);

/** 5 months, deducted every quincena. Fixed by the form's own wording. */
export const TERM_MONTHS = 5;

export const LOAN_TYPES = ["regular", "emergency"] as const;
export type LoanType = (typeof LOAN_TYPES)[number];

/**
 * Claims are assistance, not loans: nothing is repaid, so there is no co-maker,
 * deduction or term, and the chair decides alone. Both kinds share one queue
 * series (see convex/lib/queue.ts).
 */
export const CLAIM_TYPES = ["hospitalization", "terminal_illness"] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export type ApplicationType = LoanType | ClaimType;

export function isClaim(type: ApplicationType): type is ClaimType {
  return type === "hospitalization" || type === "terminal_illness";
}

/** The word the screens and emails use for one application of this type. */
export function applicationNoun(type: ApplicationType): "loan" | "claim" {
  return isClaim(type) ? "claim" : "loan";
}

/** Display names, as the client named them. */
export function typeLabel(type: ApplicationType): string {
  switch (type) {
    case "regular":
      return "Regular";
    case "emergency":
      return "Emergency";
    case "hospitalization":
      return "Hospitalization";
    case "terminal_illness":
      return "Terminal Illness";
  }
}

/**
 * The association gave no schedule of claim amounts, so the member states the
 * figure and the chair judges it. The ceiling is only what the printed form can
 * spell out in words (`amountInWords` stops below a million).
 */
export const MAX_CLAIM_AMOUNT = 999_999;

export function validateClaimAmount(amount: number): string | null {
  if (!Number.isInteger(amount) || amount <= 0) {
    return "Enter the amount claimed in whole pesos.";
  }
  if (amount > MAX_CLAIM_AMOUNT) {
    return `A claim cannot exceed ${formatPeso(MAX_CLAIM_AMOUNT)}.`;
  }
  return null;
}

/** Returns the required deduction, or undefined if the amount is not offered. */
export function deductionFor(loanAmount: number): number | undefined {
  return AMOUNT_TO_DEDUCTION[loanAmount];
}

/**
 * Validates an amount/deduction pair, returning an error message or null.
 * Used server-side at submission and client-side for live feedback.
 */
export function validateLoanTerms(
  loanAmount: number,
  deductionPerPayday: number,
): string | null {
  const expected = deductionFor(loanAmount);
  if (expected === undefined) {
    return `Loan amount must be one of ${LOAN_AMOUNTS.join(", ")}.`;
  }
  if (expected !== deductionPerPayday) {
    return `Deduction for a ${formatPeso(loanAmount)} loan must be ${formatPeso(expected)} per payday.`;
  }
  return null;
}

/** Titles exactly as they are printed beneath the signature lines. */
export function roleLabel(role: string): string {
  switch (role) {
    case "committee1":
    case "committee2":
      return "Member";
    case "chair":
      return "Chair, Loan Committee";
    case "treasurer":
      return "FA Treasurer";
    default:
      return "Borrower";
  }
}

/**
 * Titles for the screens, where the two committee seats must be told apart.
 * Only these three seats may decide on a loan; everyone else is a borrower.
 */
export function roleTitle(role: string): string {
  switch (role) {
    case "committee1":
      return "Committee Member";
    case "committee2":
      return "Committee Member";
    case "chair":
      return "Chair, Loan Committee";
    case "treasurer":
      return "FA Treasurer";
    default:
      return "Borrower";
  }
}

/**
 * The association has two committee seats, but they are not numbered posts —
 * both holders are simply "Committee Member", as the form prints them. The
 * seats exist only so the system can tell the two decisions apart.
 */
export function roleSeat(role: string): string {
  return roleTitle(role);
}

/**
 * Amounts are written out in words on the form: "TWELVE THOUSAND PESOS ONLY
 * (P 12,000.00)". Only whole peso amounts in the offered range occur, so a
 * small converter is enough.
 */
const ONES = [
  "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
  "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN",
  "SEVENTEEN", "EIGHTEEN", "NINETEEN",
];
const TENS = [
  "", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY",
  "NINETY",
];

function underThousand(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} HUNDRED`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : ""));
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(" ");
}

/** e.g. 12000 -> "TWELVE THOUSAND PESOS ONLY" */
export function amountInWords(amount: number): string {
  const whole = Math.floor(amount);
  if (whole === 0) return "ZERO PESOS ONLY";

  const parts: string[] = [];
  const thousands = Math.floor(whole / 1000);
  if (thousands > 0) parts.push(`${underThousand(thousands)} THOUSAND`);
  const rest = whole % 1000;
  if (rest > 0) parts.push(underThousand(rest));

  return `${parts.join(" ")} PESOS ONLY`;
}

/** The form writes figures as "P 12,000.00" — plain P, no peso sign. */
export function formatFormAmount(amount: number): string {
  return `P ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Presentation only — amounts are always stored as numbers. */
export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
