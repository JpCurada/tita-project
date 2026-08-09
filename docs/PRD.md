# PRD — PIT Faculty Association Loan Application System

**Client:** PIT – Faculty Association (Palompon Institute of Technology, Palompon, Leyte)
**Replaces:** `LOAN FORM TESTING (1).xlsx`
**Stack:** Next.js (App Router) + Convex + Vercel
**Date:** 2026-08-09
**Status:** Draft for approval

---

## 1. Background

The FA currently runs member loan applications through a single shared Excel workbook with
four sheets:

| Sheet | Role today | Becomes |
|---|---|---|
| `DATA` | One application's fields, entered as a vertical key/value list (A=label, B=value) | `applications` table |
| `FORM` | Printable loan form; every cell is a formula pointing back at `DATA` | Server-rendered PDF template |
| `LoanQueue` | Queue number via `COUNTIF` over date-filed | `queueNumber` assigned at submit |
| `Archive` | Flattened snapshot of past forms, one row per application (~400 columns wide) | `applications` with `status: archived` |

The workbook only holds **one** live application at a time — `DATA` is a single record, and a
new application overwrites the previous one. `Archive` is a manual copy-paste of the flattened
form. This is the root cause of most of the reported errors.

### 1.1 Why the spreadsheet errors (confirmed from the file)

These are real defects found in the workbook, and each one motivates a requirement below.

1. **Circular references.** `DATA!C2` is `=IF(B2<>"", IF(C2="", NOW(), C2), "")` — the cell
   refers to itself. `C3` does the same. Excel cannot resolve these; they are an attempt at a
   "set timestamp once and freeze it" trick that Excel does not support without iterative
   calculation enabled.
2. **Broken approval gate.** `DATA!B7` (Start Date) reads
   `=IF(B123<>"Approved", IF(B13="Approved", NOW(), B13), "")`. `B123` is an empty cell far
   below the data — almost certainly a typo for `B13`. The condition is therefore always true
   and the logic is inverted.
3. **`#N/A` everywhere in the queue.** `DATA!B17` and `FORM!B43` do
   `VLOOKUP(DATA!B2, LoanQueue!A:D, 4, FALSE)` but `LoanQueue` has exactly **one** row, whose
   `A1` is itself `=DATA!B2`. Any borrower not currently loaded into `DATA` returns `#N/A` —
   visible in `Archive` rows 3 and 4 (`NP3=#N/A`, `NP4=#N/A`) and in every `CK` (Date Filed)
   cell.
4. **Volatile dates.** `NOW()` / `TODAY()` re-evaluate on every open, so "Date Filed" and
   "Loan Released date" silently change. `FORM!C44` is
   `=IF(DATA!B13="Approved", TODAY(), "")` — the release date becomes *today*, every day.
5. **Currency concatenated into a text string.** `FORM!G14` produces `"₱"&TEXT(...)`, and
   `Archive!DT1` stored the literal `₱Regular` — the amount field captured the *loan type*.
   Amounts are strings, so they cannot be totalled or validated.
6. **Approval has no access control.** Approver names live in free-text cells `B9`–`B12` and
   status in a `B13` dropdown. Anyone who opens the file can type "Approved" and any name.
   There is no record of *who* actually approved or *when*.
7. **Data-validation drift.** `DATA!B4` (Loan Type) allows only `"Regular"` despite the form
   text reading "REGULAR/EMERGENCY". `FORM!B28` still has placeholder options
   `"Option 1,Option 2"`.
8. **Single-record bottleneck.** No two members can apply concurrently, and there is no
   history except the manual `Archive` paste.

---

## 2. Goals / Non-goals

### Goals
- Let members submit loan applications online; no spreadsheet access.
- Enforce a real three-approver workflow: **Committee Member 1, Committee Member 2, Chair**.
- Auto-assign a **queue number** on submission, stable and never `#N/A`.
- Move fully-approved (and rejected) applications into an **archive** with a printable form
  identical in layout to the current `FORM` sheet.
- Keep an immutable audit trail of every approval action.

### Non-goals (v1)
- Payroll/deduction integration with the Institute cashier.
- Repayment tracking, balances, or amortization schedules.
- Digital signature images (printed form keeps signature-over-printed-name lines).
- Member self-registration — admins onboard members.

---

## 3. Users & Roles

Two account types, as requested, with `admin` subdivided by committee position.

| Role | Who | Capabilities |
|---|---|---|
| `member` | Faculty association member | Submit application, view **own** applications + queue number + status. Cannot see other members' applications. |
| `admin:committee1` | Committee Member 1 | View all applications, cast approve/reject decision. |
| `admin:committee2` | Committee Member 2 | View all applications, cast approve/reject decision. |
| `admin:chair` | Chair, Loan Committee | View all, cast final decision, record release details, manage members. |
| `admin:treasurer` | FA Treasurer | View all, record release details. **No** approval vote. |

**Access rule (explicit client requirement):** approval actions are restricted to
Committee Member 1, Committee Member 2, and Chair. Members must never reach approval screens
or other members' data. Enforced server-side in every Convex function, not merely hidden in UI.

---

## 4. Core Workflow

```
  MEMBER                    COMMITTEE (1 & 2)            CHAIR              TREASURER/CHAIR
    │                              │                       │                      │
 submit ──> [pending] ──> both approve ──> [chair_review] ──> approve ──> [approved] ──> release
    │                              │                       │                      │
    │                         any reject                any reject                ▼
    │                              ▼                       ▼                  [released]
    └── sees queue #          [rejected] ───────────────────┘                      │
                                   │                                               ▼
                                   └──────────────> [archived] <───────────────────┘
```

### Status machine

| Status | Meaning | Who advances it |
|---|---|---|
| `pending` | Submitted, awaiting committee | Committee 1 & 2 |
| `chair_review` | Both committee members approved | Chair |
| `approved` | Chair approved; awaiting release | Treasurer/Chair |
| `rejected` | Any approver rejected (terminal) | — |
| `released` | Funds released, details recorded | System |
| `archived` | Final; read-only, printable | System |

Rules:
- Committee approvals are **independent and unordered** — either member may go first.
- A rejection at any stage is terminal and skips remaining approvers.
- `startDate` is set **once**, when the chair approves (fixes defect #2 and #4).
- Approved and rejected applications auto-archive; archive is read-only.

### Queue number
Assigned atomically at submission, monotonic per calendar year, formatted `YY-NNNN`
(e.g. `26-0007`). Stored as a literal value on the record — never recomputed, never a lookup
(fixes defect #3). Uniqueness enforced by a Convex mutation reading the current counter within
the same transaction.

---

## 5. Data Model (Convex)

```ts
// convex/schema.ts
members: {
  userId, employeeNo, firstName, middleName, lastName,
  email, position, isPermanent, role: "member"|"committee1"|"committee2"|"chair"|"treasurer",
  active: boolean,
}

applications: {
  queueNumber: string,          // "26-0007" — literal, assigned once
  memberId: Id<"members">,
  borrowerName: string,
  coMakerName: string,
  coMakerIsPermanent: boolean,
  loanType: "regular" | "emergency",
  loanAmount: number,           // 6000 | 12000 | 18000  (number, not string)
  deductionPerPayday: number,   // 600  | 1200  | 1800
  termMonths: 5,                // fixed by form text
  dateFiled: number,            // ms epoch, frozen at submit
  startDate?: number,           // set once on chair approval
  status: "pending"|"chair_review"|"approved"|"rejected"|"released"|"archived",
  releasedAt?, releasedAmount?, releasedByMemberId?,
  archivedAt?,
}

approvals: {                    // one row per approver action — the audit trail
  applicationId, approverMemberId,
  approverRole: "committee1"|"committee2"|"chair",
  decision: "approved" | "rejected",
  remarks?: string,
  decidedAt: number,
}
// unique (applicationId, approverRole) — one vote per role
```

### Validation (from the workbook's own dropdowns, corrected)
- `loanType` ∈ {Regular, Emergency} — form text says both; the sheet wrongly allowed only
  Regular (defect #7).
- `loanAmount` ∈ {6000, 12000, 18000}.
- `deductionPerPayday` ∈ {600, 1200, 1800}, and **must** satisfy
  `loanAmount / deductionPerPayday === 10` (5 months × 2 quincenas). The spreadsheet never
  checked this pairing.
- Co-maker must be a permanent-status member — the form states "(Must be in permanent status)".
- Amounts stored as numbers; the `₱` symbol is presentation only (fixes defect #5).

---

## 6. Screens

### Member
1. **Dashboard** — my applications, each with queue number and status badge.
2. **New Application** — borrower (prefilled), co-maker, loan type, amount, deduction
   (auto-derived + validated). Live preview of computed values. Submit → shows queue number.
3. **Application Detail** — status timeline, approver decisions (names + timestamps),
   print/download PDF once approved.

### Admin
4. **Queue** — table of all applications ordered by queue number, filterable by status.
   "Awaiting my decision" is the default view for committee roles.
5. **Review Detail** — full application, prior approvals, Approve / Reject + remarks.
   Approve/Reject buttons render only for `committee1`, `committee2`, `chair`.
6. **Release** — treasurer/chair records released date, amount, released-by.
7. **Archive** — searchable read-only list; open any form as PDF.
8. **Members** — chair-only: onboard members, assign roles, deactivate.

---

## 7. Printable Form

The `FORM` sheet is reproduced as an HTML/PDF template with identical wording and layout,
including the Republic of the Philippines / PIT header, the authorization paragraph, the
committee signature blocks (Member, Member, Chair), and the treasurer block. Differences from
the spreadsheet version:

- Dates are formatted from stored values, never `NOW()`/`TODAY()`.
- `Loan Number` prints the stored `queueNumber` — cannot be `#N/A`.
- Approver names come from the `approvals` audit rows, so the printed form reflects who
  actually decided.

---

## 8. Non-functional

- **Auth:** Convex Auth (email + password, or Google). Role stored on `members`, read
  server-side.
- **Authorization:** every Convex query/mutation re-checks identity and role. No client-side-only
  gating.
- **Audit:** approvals are append-only; no hard deletes of applications.
- **Deployment:** Vercel (Next.js) + Convex Cloud. Preview deploys per PR.
- **Data migration:** one-time import of the 5 `Archive` rows. Note that rows 3–4 carry `#N/A`
  queue numbers and rows 1–5 contain test data (`srg`, `SAASADA`, `dasdasd`) — these need the
  client's confirmation before import; recommend importing none and starting clean.

---

## 9. Open Questions for the Client

1. **Emergency loans** — the form says "REGULAR/EMERGENCY" but the dropdown allows only
   Regular. Do emergency loans use different amounts or terms?
2. **Committee approval order** — may Committee 1 and 2 decide in any order (assumed yes), or
   must 1 precede 2?
3. **Amount/deduction pairing** — is `amount ÷ deduction = 10` always correct, or are there
   exceptions?
4. **Co-maker** — must they be an FA member in the system, or can they be any permanent
   employee entered as free text?
5. **Archive import** — import the existing rows, or start clean? (Recommend clean; the
   existing rows are test data.)
6. **Treasurer** — confirm the treasurer only *releases* and does not vote on approval.
