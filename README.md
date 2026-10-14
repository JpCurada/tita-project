# Loan and Hospitalization Claim

Loan applications and hospitalization / terminal illness claims for the **PIT – Faculty
Association**, Palompon Institute of Technology, Palompon, Leyte. Replaces the shared
`LOAN FORM TESTING (1).xlsx` workbook.

Next.js (App Router) · Convex · deployed on Vercel.

---

## What this replaces

The workbook held one application at a time and its formulas were broken. Verified defects,
each fixed here:

| Spreadsheet defect | Fix |
|---|---|
| `DATA!C2` = `IF(B2<>"", IF(C2="", NOW(), C2), "")` — a circular reference | `dateFiled` is written once at submission |
| `DATA!B7` tested `B123` (an empty cell) instead of `B13` | An explicit status machine, no cell references |
| `VLOOKUP` into a one-row `LoanQueue` → `#N/A` for everyone | Queue number allocated atomically and stored literally |
| `NOW()` / `TODAY()` re-evaluated on every open | Dates frozen at the moment of the event |
| `Archive!DT1` stored `₱Regular` in the amount column | Amounts are numbers; currency is presentation only |
| Approvers were free-text cells anyone could type into | Server-enforced roles plus an append-only audit trail |
| One record; new applications overwrote the last | Unlimited concurrent applications |

## Roles

| Role | Can do |
|---|---|
| `member` | File an application; see **only their own** |
| `committee1` | Read the queue; cast one decision on a loan |
| `committee2` | Read the queue; cast one decision on a loan |
| `chair` | Final decision on a loan; **sole** decision on a claim; manage members; may also record releases |
| `treasurer` | Record releases. **Cannot** vote on approvals |

Approval is restricted to the two committee seats and the chair — enforced in every Convex
function, not merely hidden in the UI. Both seats are shown as "Committee Member"; they are
stored separately only so the system can tell the two decisions on a loan apart.

The chair may hold the treasurer's duties as well, which is the association's present
arrangement — `recordRelease` accepts either role.

Members **register themselves**. Anyone can create an account and file a loan straight away;
permanent status is self-declared and the committee checks it at review, as it did on paper.
The chair assigns the committee seats.

## Flow

```
member submits ──> pending ──> both committee approve ──> chair_review
                                                              │
                                    chair approves ───────────┘
                                          │
                                       approved ──> treasurer releases ──> archived
                                                                              ▲
                     any approver rejects ─────────────────────────────────────┘
                                          (terminal, outcome = "rejected")
```

`status` tracks lifecycle position; `outcome` records the terminal verdict, so archiving a
rejection does not erase the fact that it was rejected.

**Claims** (hospitalization, terminal illness) skip the committee. They are filed straight
into `chair_review`, the chair's decision alone approves or rejects them, and `castDecision`
refuses either committee seat on a claim. Approved claims go to the treasurer like loans. A
claim asks only for the amount: there is no co-maker, deduction or term, so those fields are
unset on claim rows. A member may have one loan and one claim in progress at the same time.

Queue numbers are `YY-NNNN` for loans (e.g. `26-0007`) and `HYY-NNNN` for claims (e.g.
`H26-0001`), each its own sequence, allocated per calendar year in Manila time and stored as a
literal value.

---

## Local development

```bash
npm install
npx convex dev        # provisions a dev deployment, generates convex/_generated
npx @convex-dev/auth  # sets JWT_PRIVATE_KEY / JWKS on that deployment
npm run dev
```

### Creating the first chair

Nobody can assign committee seats until a chair exists. Sign up in the app with the chair's
email, then promote that account from the CLI:

```bash
npx convex run members:bootstrapChair '{
  "email": "chair@pit.edu.ph",
  "employeeNo": "1001",
  "firstName": "Sansino Rian",
  "lastName": "Guanzon"
}'
```

`bootstrapChair` is an `internalMutation`, so it is unreachable from any browser, and it
refuses to run once a chair exists.

For a working set of members and loans at every stage:

```bash
node scripts/seed.mjs --reset
```

## Verification

```bash
node scripts/verify.mjs --wipe            # 49 assertions against a live deployment
npx tsx scripts/pdf-preview.mts out.pdf   # render the printable form
```

`verify.mjs` creates real password accounts and drives the public API exactly as a browser
would, covering: queue-number allocation under 20 truly concurrent submissions, every
authorization boundary, the full approval and rejection paths, and printable-form access.

> **Destructive.** It deletes every member, application and approval first, which is why
> `--wipe` is required. It refuses anything that is not a dev deployment. Run
> `node scripts/seed.mjs --reset` afterwards to restore the roster.

### Building locally

`npm run build` writes to `.next-build`, not `.next`, so a local production build cannot
delete the chunks a running `next dev` is serving. Vercel runs `npm run build:ci`, which uses
the default `.next`.

## Deploying

See [docs/DEPLOY.md](docs/DEPLOY.md) for the full sequence. In short:

1. `npx convex deploy` to create the production deployment, then take a
   production deploy key from the Convex dashboard.
2. Set the production environment on Convex, including `npx @convex-dev/auth
   --prod` — skipping that makes sign-in fail in a way that looks like nothing
   is wrong.
3. Import the repository on Vercel and set `CONVEX_DEPLOY_KEY`. The build
   command comes from `vercel.json`. Do not set `NEXT_PUBLIC_CONVEX_URL`;
   `convex deploy` injects it.
4. Sign up as the chair on the live site, then promote that account with
   `npx convex run members:bootstrapChair '{...}' --prod`.
5. Verify `pit.edu.ph` with Resend. Until then no email reaches members.

## Layout

```
convex/
  schema.ts          tables + indexes
  applications.ts    submission, state machine, queries
  members.ts         member management, bootstrapChair
  testing.ts         internal helpers for the scripts
  notify.ts          outgoing email, scheduled from the mutations
  ResendOTP*.ts      sign-up confirmation and password reset codes
  lib/
    auth.ts          role wrappers — the authorization boundary
    queue.ts         atomic queue-number allocation
    loan.ts          amount/deduction rules, shared with the UI
src/
  app/               routes: signin, dashboard, apply, queue, release, archive, members
    api/applications/[id]/pdf/   printable form (Node runtime)
  components/
    LoanFormPdf.tsx  the printed form
```

## Known advisories

`npm audit` reports two issues that are **not fixed deliberately**:

- **`@auth/core` (critical)** — the advisories cover OAuth state/nonce/PKCE handling and
  malformed Bearer headers. This app uses the Password provider only, so those paths are not
  reachable. The patched version is incompatible with `@convex-dev/auth@0.0.87`; upgrading
  breaks authentication entirely. Revisit when Convex Auth supports `@auth/core` ≥ 0.41.3.
- **`postcss` (high)** — a build-time dependency of Next.js, not shipped to the browser. The
  fix requires a Next.js major upgrade.

## Notes for the client

- **Claim amounts** are entered by the member (whole pesos, up to ₱999,999) because no
  schedule of claim amounts was given. If the association has fixed amounts or a ceiling,
  `validateClaimAmount` in `convex/lib/loan.ts` is the one place to set them.
- **Emergency loans** currently use the same amounts and 5-month term as regular loans; the
  type only changes what prints on the form. The spreadsheet's dropdown allowed `Regular`
  only while the form text said "REGULAR/EMERGENCY", so this needs confirmation.
- **Nothing was imported** from the old workbook. Its five `Archive` rows are test data
  (`srg`, `SAASADA`, `dasdasd`), four carry `#N/A` dates, and the amount column never held a
  real amount. Numbering starts clean at `26-0001`.
- **Amounts print as `P 12,000.00`**, matching `Loan Application Form.doc`. The standard PDF
  fonts have no `₱` glyph and would render a wrong character.
- **Email reaches nobody until `pit.edu.ph` is verified with Resend.** Password reset, loan
  notifications and sign-up confirmation all depend on it. See
  [docs/DEPLOY.md](docs/DEPLOY.md) section 6.
- **Anyone can register.** There is no restriction on the email address, so the committee's
  review is the only check on who files a loan. Restricting sign-up to `@pit.edu.ph` is a
  small change if that turns out to be too open.
