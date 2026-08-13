// Imported explicitly: this component is also called directly (from the PDF
// route handler and scripts/pdf-preview.mts), outside Next's JSX transform.
import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { amountInWords, formatFormAmount } from "@convex/lib/loan";
import { PIT_LOGO_DATA_URI } from "@/assets/pitLogo";

/**
 * Reproduces `Loan Application Form.doc`, the association's own template.
 *
 * Wording and order follow that document verbatim: the amount spelled out
 * before the figure, "approved/disapproved" with the losing word struck
 * through, "Borrower No." for the queue number, and the treasurer's
 * "Signature & Date Released" block.
 *
 * Every value is filled from stored data. The template hardcodes the current
 * officers' names; here they come from the approvals audit trail, so the
 * printed page shows who actually decided.
 */

const MANILA = "Asia/Manila";

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 52,
    fontFamily: "Times-Roman",
    fontSize: 10.5,
    lineHeight: 1.45,
    color: "#000",
  },
  masthead: { flexDirection: "row", alignItems: "center" },
  seal: { width: 52, height: 52 },
  mastheadText: { flex: 1, alignItems: "center", paddingRight: 52 },
  title: { fontFamily: "Times-Bold", fontSize: 15, letterSpacing: 0.4 },
  committee: { fontFamily: "Times-Bold", fontSize: 10.5, marginTop: 4 },
  dateRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    marginTop: 8,
  },
  para: { marginTop: 14, textAlign: "justify" },
  bold: { fontFamily: "Times-Bold" },
  // A ruled blank, whether or not it has been filled in.
  fill: {
    borderBottomWidth: 0.9,
    borderBottomColor: "#000",
    fontFamily: "Times-Bold",
    textAlign: "center",
    paddingHorizontal: 3,
  },
  // A fixed width, not a minimum: `minWidth` leaves the Text at its content
  // width, so `textAlign: center` has nothing to centre within and the caption
  // sits at the left end of its rule.
  sigBlock: { width: 232 },
  sigName: {
    fontFamily: "Times-Bold",
    textAlign: "center",
    width: 232,
    paddingBottom: 1,
  },
  sigRule: {
    borderTopWidth: 0.9,
    borderTopColor: "#000",
    paddingTop: 2,
    width: 232,
    textAlign: "center",
    fontSize: 8.5,
  },
  // An underlined run that flows inside a paragraph, unlike the block `fill`.
  inlineFill: {
    fontFamily: "Times-Bold",
    textDecoration: "underline",
  },
  caption: { fontSize: 8.5, textAlign: "center" },
  right: { alignItems: "flex-end" },
  columns: { flexDirection: "row", justifyContent: "space-between" },
  heading: {
    fontFamily: "Times-Bold",
    fontSize: 12,
    textAlign: "center",
    letterSpacing: 0.6,
  },
  strike: { textDecoration: "line-through", color: "#666" },
});

export type LoanFormData = {
  queueNumber: string;
  borrowerName: string;
  coMakerName: string;
  loanType: "regular" | "emergency";
  loanAmount: number;
  deductionPerPayday: number;
  dateFiled: number;
  startDate?: number;
  outcome?: "approved" | "rejected";
  releasedAt?: number;
  releasedAmount?: number;
  releasedByName: string | null;
  treasurerName: string | null;
  decisions: {
    approverRole: string;
    approverName: string;
    decision: "approved" | "rejected";
    decidedAt: number;
  }[];
};

function fmt(ms: number | undefined, options: Intl.DateTimeFormatOptions) {
  if (ms === undefined) return "";
  return new Date(ms).toLocaleDateString("en-PH", { timeZone: MANILA, ...options });
}

/** Prints an empty rule when there is nothing to fill in, as on paper. */
function Fill({ value, width }: { value: string; width: number }) {
  return (
    <Text style={[styles.fill, { minWidth: width }]}>
      {value === "" ? " " : value}
    </Text>
  );
}

function Signature({
  name,
  caption,
  extra,
}: {
  name: string;
  caption: string;
  extra?: string;
}) {
  return (
    <View style={styles.sigBlock}>
      <Text style={styles.sigName}>{name || " "}</Text>
      <Text style={styles.sigRule}>{caption}</Text>
      {extra && <Text style={[styles.caption, { width: 232 }]}>{extra}</Text>}
    </View>
  );
}

/** The deduction is written in title case on the form; the loan amount is caps. */
function titleCaseWords(words: string): string {
  return words
    .replace(/ ONLY$/, "")
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function LoanFormPdf({ data }: { data: LoanFormData }) {
  const committee = ["committee1", "committee2"].map((role) =>
    data.decisions.find((d) => d.approverRole === role),
  );
  const chair = data.decisions.find((d) => d.approverRole === "chair");

  // The template carries one dated decision line, and the chair's ruling is the
  // operative one. Before the chair rules, fall back to the most recent
  // committee decision so a disapproved form still prints a date.
  const decisionAt =
    chair?.decidedAt ??
    data.decisions.map((d) => d.decidedAt).sort((a, b) => b - a)[0];

  const approved = data.outcome === "approved";
  const disapproved = data.outcome === "rejected";

  return (
    <Document
      title={`Loan Application ${data.queueNumber}`}
      author="PIT Faculty Association"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.masthead}>
          <Image style={styles.seal} src={PIT_LOGO_DATA_URI} />
          <View style={styles.mastheadText}>
            <Text style={styles.title}>Loan Application</Text>
            <Text style={styles.committee}>LOAN COMMITTEE</Text>
            <Text style={styles.committee}>PIT-FACULTY ASSOCIATION</Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <Text>Date Filed</Text>
          <Fill value={fmt(data.dateFiled, { dateStyle: "long" })} width={136} />
        </View>

        {/* Nested inside a single <Text> so the bold runs wrap as prose;
            sibling <Text> nodes in a flex row each start a new line. */}
        <View style={styles.para}>
          <Text>
            {"        "}I hereby apply for a REGULAR/EMERGENCY loan in the amount
            of <Text style={styles.bold}>
              {amountInWords(data.loanAmount)} ({formatFormAmount(data.loanAmount)})
            </Text>{" "}
            payable within five (5) months to be deducted every quincena in the
            amount of{" "}
            <Text style={styles.bold}>
              {titleCaseWords(amountInWords(data.deductionPerPayday))} (
              {formatFormAmount(data.deductionPerPayday)})
            </Text>{" "}
            only effective{" "}
            <Text style={styles.inlineFill}>
              {fmt(data.startDate, { month: "long", day: "numeric" }) ||
                "                "}
            </Text>
            , 20{" "}
            <Text style={styles.inlineFill}>
              {fmt(data.startDate, { year: "2-digit" }) || "    "}
            </Text>
            .
          </Text>
        </View>

        <View style={[styles.right, { marginTop: 22 }]}>
          <Signature
            name={data.borrowerName}
            caption="Signature Over Printed Name of Borrower"
          />
        </View>

        <View style={{ marginTop: 16 }}>
          <Signature
            name={data.coMakerName}
            caption="Signature Over Printed Name of Co-maker"
            extra="(Must be in permanent status)"
          />
        </View>

        <View style={[styles.right, { marginTop: 14 }]}>
          <Text style={styles.sigName}>
            {data.treasurerName ?? data.releasedByName ?? " "}
          </Text>
          <Text style={[styles.caption, { width: 232 }]}>FA Treasurer</Text>
        </View>

        <View style={{ marginTop: 14, width: 232 }}>
          <Text style={styles.sigName}>
            {data.releasedAt === undefined
              ? " "
              : fmt(data.releasedAt, { dateStyle: "long" })}
          </Text>
          <Text style={styles.sigRule}>Signature &amp; Date Released</Text>
        </View>

        {/* Left-aligned, not justified: justification stretches the spaces
            around the struck-through word and drags its rule into the next
            word. */}
        <View style={[styles.para, { marginTop: 18, textAlign: "left" }]}>
          <Text>
            {"        "}On this date, the{" "}
            <Text style={styles.inlineFill}>
              {fmt(decisionAt, { day: "2-digit" }) || "      "}
            </Text>{" "}
            day of{" "}
            <Text style={styles.inlineFill}>
              {fmt(decisionAt, { month: "long" }) ||
                "            "}
            </Text>
            , 20{" "}
            <Text style={styles.inlineFill}>
              {fmt(decisionAt, { year: "2-digit" }) || "    "}
            </Text>{" "}
            we hereby{" "}
            {/* Only the surviving word is printed. Struck-through text bleeds
                its rule into the following words here, and a form that reads
                "approved" cleanly is closer to the intent than one where the
                crossing-out is ambiguous. */}
            <Text style={styles.bold}>
              {approved ? "approved" : disapproved ? "disapproved" : "approved/disapproved"}
            </Text>{" "}
            the application of the above loan.
          </Text>
        </View>

        <View style={[styles.columns, { marginTop: 22 }]}>
          {committee.map((decision, index) => (
            <Signature
              key={index}
              name={decision?.approverName ?? ""}
              caption="Member"
            />
          ))}
        </View>

        <View style={{ marginTop: 16, alignItems: "center" }}>
          <Signature
            name={chair?.approverName ?? ""}
            caption="Chair, Loan Committee"
          />
        </View>

        <View
          style={[styles.dateRow, { marginTop: 14, justifyContent: "flex-start" }]}
        >
          <Text>Borrower No.</Text>
          <Fill value={data.queueNumber} width={116} />
        </View>

        <Text style={[styles.heading, { marginTop: 20 }]}>AUTHORIZATION</Text>

        <View style={[styles.para, { marginTop: 10 }]}>
          <Text>
            {"        "}I hereby authorize the cashier of the Institute to deduct
            the amount of{" "}
            <Text style={styles.bold}>
              {titleCaseWords(amountInWords(data.deductionPerPayday))} (
              {formatFormAmount(data.deductionPerPayday)})
            </Text>{" "}
            each payday starting{" "}
            <Text style={styles.inlineFill}>
              {fmt(data.startDate, { month: "long", day: "numeric" }) ||
                "                "}
            </Text>
            , 20{" "}
            <Text style={styles.inlineFill}>
              {fmt(data.startDate, { year: "2-digit" }) || "    "}
            </Text>{" "}
            as payment of the Regular/Emergency loan until the whole amount shall
            have been fully paid.
          </Text>
        </View>

        <View style={[styles.right, { marginTop: 22 }]}>
          <Signature
            name={data.borrowerName}
            caption="Signature Over Printed Name of Borrower"
          />
        </View>
      </Page>
    </Document>
  );
}
