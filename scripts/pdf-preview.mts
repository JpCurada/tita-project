/**
 * Renders the loan form to a PDF with representative data so the layout can be
 * eyeballed without standing up the whole app.
 *
 *   npx tsx scripts/pdf-preview.mts [outfile.pdf]
 */
import { renderToFile } from "@react-pdf/renderer";
import { LoanFormPdf, type LoanFormData } from "../src/components/LoanFormPdf.js";

const now = Date.now();
const day = 86_400_000;

const data: LoanFormData = {
  queueNumber: "26-0007",
  borrowerName: "Juan P. Dela Cruz",
  coMakerName: "Maria S. Santos",
  loanType: "regular",
  loanAmount: 12000,
  deductionPerPayday: 1200,
  dateFiled: now - day * 9,
  startDate: now,
  outcome: "approved",
  releasedAt: now,
  releasedAmount: 12000,
  releasedByName: "Rosa M. Lim",
  treasurerName: "Rosa M. Lim",
  decisions: [
    { approverRole: "committee1", approverName: "Geryl D. Cataraja", decision: "approved", decidedAt: now - day * 5 },
    { approverRole: "committee2", approverName: "Albert C. Sanico", decision: "approved", decidedAt: now - day * 3 },
    { approverRole: "chair", approverName: "Sansino Rian C. Guanzon", decision: "approved", decidedAt: now },
  ],
};

const out = process.argv[2] ?? "loan-form-preview.pdf";
await renderToFile(LoanFormPdf({ data }), out);
console.log(`Wrote ${out}`);
