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

/** Titles as they appear on the printed form. */
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
      return "Member";
  }
}

/** Longer titles for the admin screens, where the two posts must be told apart. */
export function roleTitle(role: string): string {
  switch (role) {
    case "committee1":
      return "Committee Member 1";
    case "committee2":
      return "Committee Member 2";
    case "chair":
      return "Chair, Loan Committee";
    case "treasurer":
      return "FA Treasurer";
    default:
      return "Member";
  }
}

/** Presentation only — amounts are always stored as numbers. */
export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
