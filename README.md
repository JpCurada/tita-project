# PIT FA Loan Application System

Loan applications for the **PIT – Faculty Association**, Palompon Institute of Technology,
Palompon, Leyte. Replaces the shared `LOAN FORM TESTING (1).xlsx` workbook.

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
| `committee1` | Read the queue; cast one decision |
| `committee2` | Read the queue; cast one decision |
| `chair` | Final decision; manage members |
| `treasurer` | Record releases. **Cannot** vote on approvals |

Approval is restricted to Committee Member 1, Committee Member 2 and the Chair — enforced in
every Convex function, not merely hidden in the UI.

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

Queue numbers are `YY-NNNN` (e.g. `26-0007`), allocated per calendar year in Manila time and
stored as a literal value.

---

## Local development

```bash
npm install
npx convex dev        # provisions a dev deployment, generates convex/_generated
npx @convex-dev/auth  # sets JWT_PRIVATE_KEY / JWKS on that deployment
npm run dev
```

### Creating the first chair

Nobody can onboard members until a chair exists. Sign up in the app with the chair's email,
then promote that account from the CLI:

```bash
npx convex run members:bootstrapChair '{
  "email": "chair@pit.edu.ph",
  "employeeNo": "1001",
  "firstName": "Sansino Rian",
  "lastName": "Guanzon"
}'
```

`bootstrapChair` is an `internalMutation`, so it is unreachable from any browser, and it
refuses to run once a chair exists. The chair then adds everyone else under **Members**.

Members sign up themselves with the email address the chair registered; the accounts link
automatically on first sign-in.

## Verification

```bash
node scripts/verify.mjs        # 47 assertions against a live deployment
npx tsx scripts/pdf-preview.mts out.pdf   # render the printable form
```

`verify.mjs` creates real password accounts and drives the public API exactly as a browser
would, covering: queue-number allocation under 20 truly concurrent submissions, every
authorization boundary, the full approval and rejection paths, and printable-form access.

> It resets all application data first — run it against a **dev** deployment only.

## Deploying to Vercel

1. **Build command:** `npx convex deploy --cmd 'npm run build'`
2. **Environment variable:** `CONVEX_DEPLOY_KEY` — a *production* deploy key from the Convex
   dashboard. `NEXT_PUBLIC_CONVEX_URL` is injected automatically by `convex deploy`; do not
   set it by hand.
3. After the first deploy, initialise auth keys on production:
   ```bash
   npx @convex-dev/auth --prod
   ```
   Skipping this causes sign-in to fail in a way that looks like nothing is wrong.
4. Set `SITE_URL` on the Convex production deployment to the Vercel domain.
5. Create the first chair against production by adding `--prod` to the `bootstrapChair` command.

For preview deployments, add a separate **preview** deploy key scoped to Vercel's Preview
environment; each branch then gets its own isolated Convex backend.

## Layout

```
convex/
  schema.ts          tables + indexes
  applications.ts    submission, state machine, queries
  members.ts         member management, bootstrapChair
  testing.ts         internal helpers for scripts/verify.mjs
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

- **Emergency loans** currently use the same amounts and 5-month term as regular loans; the
  type only changes what prints on the form. The spreadsheet's dropdown allowed `Regular`
  only while the form text said "REGULAR/EMERGENCY", so this needs confirmation.
- **Nothing was imported** from the old workbook. Its five `Archive` rows are test data
  (`srg`, `SAASADA`, `dasdasd`), four carry `#N/A` dates, and the amount column never held a
  real amount. Numbering starts clean at `26-0001`.
- **Amounts print as `PHP 12,000.00`.** The standard PDF fonts have no `₱` glyph and would
  render a wrong character; embedding a font for one symbol is not worth the bundle size.
