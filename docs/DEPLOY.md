# Deploying

Two services. **Convex** holds the data and runs the backend functions.
**Vercel** serves the Next.js app. The Vercel build deploys Convex first, so a
push ships both together.

Roughly 30 minutes, plus however long DNS takes to propagate for email.

---

## 1. Push the code

```bash
git push origin main
```

---

## 2. Create the Convex production deployment

Development has been running against `dev:unique-clownfish-447`. Production is a
separate deployment with its own, empty database.

```bash
npx convex deploy
```

This creates the production deployment and pushes the schema and functions to
it. Then take a **production deploy key** from the Convex dashboard:

Settings → **Production** → Deploy Keys → *Generate a production deploy key*

Keep it for step 4.

---

## 3. Set the production environment variables

These live on the Convex deployment, not in the repository or on Vercel — the
backend is what reads them.

```bash
# Signing keys for auth. Without these, sign-in fails in a way that looks
# like nothing is wrong.
npx @convex-dev/auth --prod

# Where the app is served from.
npx convex env set SITE_URL https://your-app.vercel.app --prod

# Email. See section 6 — until a domain is verified these only reach the
# address that owns the Resend account.
npx convex env set AUTH_RESEND_KEY re_xxxxxxxx --prod
npx convex env set AUTH_EMAIL_FROM "Loan and Hospitalization Claim <onboarding@resend.dev>" --prod

# Sign-up email confirmation. Leave this off until the domain is verified,
# or every member with a pit.edu.ph address is locked out.
npx convex env set AUTH_REQUIRE_EMAIL_VERIFICATION false --prod
```

Check them:

```bash
npx convex env list --prod
```

---

## 4. Connect Vercel

Import `JpCurada/tita-project` at [vercel.com/new](https://vercel.com/new).

Vercel reads `vercel.json`, so the build command is already set:

```
npx convex deploy --cmd 'npm run build:ci'
```

Add one environment variable, for **Production**:

| Name | Value |
|---|---|
| `CONVEX_DEPLOY_KEY` | the production deploy key from step 2 |

Do **not** set `NEXT_PUBLIC_CONVEX_URL`. `convex deploy` injects it during the
build, and a hardcoded value would point the live site at the wrong backend.

Deploy. The build deploys Convex, then builds Next.

---

## 5. Create the first chair

The production database is empty, and only a chair can assign committee seats.
Nobody can be promoted until one exists, so the first one is made from the CLI.

1. Open the deployed site and **create an account** with the chair's email.
2. Promote it:

```bash
npx convex run members:bootstrapChair '{
  "email": "s.guanzon@pit.edu.ph",
  "employeeNo": "2009-0054",
  "firstName": "Sansino Rian",
  "lastName": "Guanzon"
}' --prod
```

`bootstrapChair` is an `internalMutation`, so no browser can reach it, and it
refuses once a chair exists.

The chair then signs in and assigns the two committee seats from **Members**.
Everyone else registers themselves and can file a loan immediately.

---

## 6. Verify the email domain

**Nothing email-dependent works for real members until this is done** — not
password reset, not the loan notifications, not sign-up confirmation. Resend
only delivers to the address that owns the account until a domain is verified.

1. [resend.com/domains](https://resend.com/domains) → **Add Domain** →
   `pit.edu.ph`
2. Add the DNS records Resend gives you. This needs whoever administers the
   school's domain, which is usually the slow part.
3. Once it shows **Verified**:

```bash
npx convex env set AUTH_EMAIL_FROM "Loan and Hospitalization Claim <loans@pit.edu.ph>" --prod
```

4. Optionally require confirmation at sign-up:

```bash
npx convex env set AUTH_REQUIRE_EMAIL_VERIFICATION true --prod
```

Until step 3, leave that flag `false`. The roster is not the gate any more —
members register themselves — so turning it on early only locks people out.

---

## Checking a deployment

- Sign in as the chair; the header should show **Chair, Loan Committee**.
- File a loan as an ordinary member and confirm a queue number is issued.
- Approve it as both committee members, then as the chair.
- Record the release and open the printable form.
- Confirm the archive lists it.

If sign-in fails with no clear reason, `npx @convex-dev/auth --prod` was
probably skipped in step 3.

---

## Afterwards

**Pushing to `main` redeploys.** Vercel rebuilds and `convex deploy` pushes any
schema or function change to production.

**Preview deployments.** A *preview* deploy key (a distinct type) set on
Vercel's Preview environment gives every pull request its own isolated Convex
backend, so branches never touch production data.

**Never run the scripts against production.** `scripts/verify.mjs` deletes every
member, application and approval; it refuses anything that is not a dev
deployment, and refuses even then without `--wipe`. `scripts/seed.mjs` creates
fictional members and loans and has no place in production.
