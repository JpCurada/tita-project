// Imported explicitly: this component is also called directly (from the PDF
// route handler and scripts/pdf-preview.mts), outside Next's JSX transform.
import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
/**
 * The standard Type1 fonts have no ₱ glyph, so `formatPeso` from the shared lib
 * would render a wrong character here. Embedding a font just for one symbol is
 * not worth ~300 KB in a serverless bundle, so the form prints "PHP" — which is
 * also what the Institute's cashier paperwork uses.
 */
function peso(amount: number): string {
  return `PHP ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Reproduces the FORM sheet of the original workbook. Wording, ordering and the
 * signature blocks are kept verbatim so the printed output is recognisable to
 * anyone used to the paper form — including the en-dash in "PIT – FACULTY
 * ASSOCIATION" and the "REGULAR/EMERGENCY" phrasing.
 *
 * Everything is rendered from stored values. The spreadsheet hardcoded the
 * committee members' names into the template; here they come from the audit
 * trail, so the form shows who actually decided.
 */

const MANILA = "Asia/Manila";

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 54,
    fontFamily: "Times-Roman",
    fontSize: 10.5,
    lineHeight: 1.35,
    color: "#000",
  },
  center: { textAlign: "center" },
  header: { fontSize: 10.5 },
  headerInstitute: { fontFamily: "Times-Bold" },
  association: { fontFamily: "Times-Bold", marginTop: 6, fontSize: 11.5 },
  title: {
    fontFamily: "Times-Bold",
    fontSize: 13,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  committee: { marginTop: 7, fontFamily: "Times-Bold", fontSize: 10.5 },
  dateFiledRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    marginBottom: 2,
  },
  body: { marginTop: 12, textAlign: "justify" },
  inline: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end" },
  fill: {
    borderBottomWidth: 0.8,
    borderBottomColor: "#000",
    paddingHorizontal: 4,
    fontFamily: "Times-Bold",
    textAlign: "center",
  },
  signatureBlock: { marginTop: 22, alignItems: "center" },
  signatureName: {
    fontFamily: "Times-Bold",
    borderBottomWidth: 0.8,
    borderBottomColor: "#000",
    paddingHorizontal: 24,
    paddingBottom: 1,
    minWidth: 210,
    textAlign: "center",
  },
  caption: { fontSize: 8.5, marginTop: 2, textAlign: "center" },
  columns: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  column: { width: "46%", alignItems: "center" },
  sectionHeading: {
    fontFamily: "Times-Bold",
    fontSize: 11.5,
    marginTop: 20,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 18,
    borderTopWidth: 0.8,
    borderTopColor: "#000",
    paddingTop: 8,
  },
  footerRow: { flexDirection: "row", marginBottom: 3 },
  footerLabel: { width: 108 },
  footerValue: { fontFamily: "Times-Bold" },
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

/** A blank underlined slot, so an undecided field still prints a rule to sign. */
function Fill({ value, width }: { value: string; width: number }) {
  return (
    <Text style={[styles.fill, { minWidth: width }]}>{value === "" ? " " : value}</Text>
  );
}

export function LoanFormPdf({ data }: { data: LoanFormData }) {
  const committee = ["committee1", "committee2"].map((role) =>
    data.decisions.find((d) => d.approverRole === role),
  );
  const chair = data.decisions.find((d) => d.approverRole === "chair");

  // The decision date shown is the chair's, matching the sheet's single
  // "On this date, the ___ day of ___" line.
  const decisionAt = chair?.decidedAt;
  const verdict =
    data.outcome === "rejected"
      ? "disapproved"
      : data.outcome === "approved"
        ? "approved"
        : "";

  return (
    <Document
      title={`Loan Application ${data.queueNumber}`}
      author="PIT Faculty Association"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.center}>
          <Text style={styles.header}>Republic of the Philippines</Text>
          <Text style={[styles.header, styles.headerInstitute]}>
            Palompon Institute of Technology
          </Text>
          <Text style={styles.header}>Palompon, Leyte</Text>
          <Text style={styles.association}>PIT – FACULTY ASSOCIATION</Text>
          <Text style={styles.title}>Loan Application</Text>
          <Text style={styles.committee}>LOAN COMMITTEE</Text>
          <Text style={styles.committee}>PIT-FACULTY ASSOCIATION</Text>
        </View>

        <View style={styles.dateFiledRow}>
          <Text>Date Filed: </Text>
          <Fill value={fmt(data.dateFiled, { dateStyle: "long" })} width={130} />
        </View>

        <View style={styles.body}>
          <View style={styles.inline}>
            <Text>I hereby apply for a REGULAR/EMERGENCY loan in the amount of </Text>
            <Fill value={peso(data.loanAmount)} width={100} />
            <Text> payable within five (5) months to be deducted every quincena in the amount of </Text>
            <Fill value={peso(data.deductionPerPayday)} width={90} />
            <Text> only effective </Text>
            <Fill value={fmt(data.startDate, { month: "long", day: "numeric" })} width={100} />
            <Text> , 20</Text>
            <Fill value={fmt(data.startDate, { year: "2-digit" })} width={26} />
            <Text> .</Text>
          </View>
        </View>

        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.signatureName}>{data.coMakerName}</Text>
            <Text style={styles.caption}>Signature Over Printed Name of Co-maker</Text>
            <Text style={styles.caption}>(Must be in permanent status)</Text>
          </View>
          <View style={styles.column}>
            <Text style={styles.signatureName}>{data.borrowerName}</Text>
            <Text style={styles.caption}>Signature Over Printed Name of Borrower</Text>
          </View>
        </View>

        <View style={[styles.body, { marginTop: 24 }]}>
          <View style={styles.inline}>
            <Text>On this date, the </Text>
            <Fill value={fmt(decisionAt, { day: "2-digit" })} width={30} />
            <Text> day of </Text>
            <Fill value={fmt(decisionAt, { month: "long" })} width={80} />
            <Text> , 20</Text>
            <Fill value={fmt(decisionAt, { year: "2-digit" })} width={26} />
            <Text> we hereby </Text>
            <Fill value={verdict} width={80} />
            <Text> the application of the above loan.</Text>
          </View>
        </View>

        <View style={styles.columns}>
          {committee.map((decision, index) => (
            <View key={index} style={styles.column}>
              <Text style={styles.signatureName}>
                {decision?.approverName ?? " "}
              </Text>
              <Text style={styles.caption}>Member</Text>
            </View>
          ))}
        </View>

        <View style={styles.signatureBlock}>
          <Text style={styles.signatureName}>{chair?.approverName ?? " "}</Text>
          <Text style={styles.caption}>Chair, Loan Committee</Text>
        </View>

        <Text style={styles.sectionHeading}>AUTHORIZATION</Text>

        <View style={[styles.body, { marginTop: 10 }]}>
          <View style={styles.inline}>
            <Text>I hereby authorize the cashier of the Institute to deduct the amount of </Text>
            <Fill value={peso(data.deductionPerPayday)} width={90} />
            <Text> each payday starting </Text>
            <Fill value={fmt(data.startDate, { month: "long", day: "numeric" })} width={100} />
            <Text> , 20</Text>
            <Fill value={fmt(data.startDate, { year: "2-digit" })} width={26} />
            <Text> as payment of the Regular/Emergency loan until the whole amount shall have been fully paid.</Text>
          </View>
        </View>

        <View style={[styles.signatureBlock, { marginTop: 20 }]}>
          <Text style={styles.signatureName}>{data.borrowerName}</Text>
          <Text style={styles.caption}>Signature Over Printed Name of Borrower</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text style={styles.footerLabel}>Loan Number:</Text>
            <Text style={styles.footerValue}>{data.queueNumber}</Text>
          </View>
          <View style={styles.footerRow}>
            <Text style={styles.footerLabel}>Loan Released date:</Text>
            <Text style={styles.footerValue}>
              {fmt(data.releasedAt, { dateStyle: "long" })}
            </Text>
          </View>
          <View style={styles.footerRow}>
            <Text style={styles.footerLabel}>Amount Released:</Text>
            <Text style={styles.footerValue}>
              {data.releasedAmount === undefined
                ? ""
                : peso(data.releasedAmount)}
            </Text>
          </View>
          <View style={styles.footerRow}>
            <Text style={styles.footerLabel}>Released by:</Text>
            <Text style={styles.footerValue}>
              {data.releasedByName ?? data.treasurerName ?? ""}
            </Text>
          </View>
          <Text style={[styles.caption, { textAlign: "left", marginTop: 6 }]}>
            FA Treasurer
          </Text>
        </View>
      </Page>
    </Document>
  );
}
