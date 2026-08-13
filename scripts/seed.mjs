/**
 * Seeds a working association: two committee members, a chair who is also the
 * treasurer, and a borrower — plus loans at each stage of the flow.
 *
 *   node scripts/seed.mjs                 # keeps existing data
 *   node scripts/seed.mjs --reset         # wipes first
 *
 * Everything goes through the public API, so the seeded state is reachable the
 * same way the app would produce it.
 */
import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = /NEXT_PUBLIC_CONVEX_URL=(.+)/.exec(env)[1].trim();

const cli = fileURLToPath(
  new URL("../node_modules/convex/bin/main.js", import.meta.url),
);
const run = (name, args = {}) => {
  const out = execFileSync(
    process.execPath,
    [cli, "run", name, JSON.stringify(args)],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
};

const PASSWORD = "Palompon2026!";
const clients = [];

/**
 * Returns a client signed in as `email` with the known password.
 *
 * Deletes any pre-existing auth account first: a half-finished earlier run can
 * leave an account whose password is not the one below, and the resulting
 * "password mismatch" is confusing to debug. Recreating is deterministic.
 */
async function account(email) {
  run("testing:deleteAuthAccount", { email });

  const client = new ConvexClient(url);
  clients.push(client);
  const res = await client.action(api.auth.signIn, {
    provider: "password",
    params: { email, password: PASSWORD, flow: "signUp" },
  });
  if (!res?.tokens?.token) {
    throw new Error(`sign-up produced no token for ${email}`);
  }
  client.setAuth(async () => res.tokens.token);
  await client.mutation(api.members.claimProfile, {});
  return client;
}

if (process.argv.includes("--reset")) {
  console.log("Clearing existing data…");
  run("testing:reset");
}

/**
 * The committee holds two seats and a chair. Guanzon chairs the committee and
 * keeps the association's funds, so he also records releases — the release
 * mutation already accepts the chair in the treasurer's stead.
 *
 * The seats are stored as committee1 and committee2 so the system can tell the
 * two decisions on a loan apart; neither is shown as numbered anywhere.
 */
const ROSTER = [
  {
    key: "c1",
    firstName: "Geryl",
    middleName: "D.",
    lastName: "Cataraja",
    email: "g.cataraja@pit.edu.ph",
    employeeNo: "2011-0087",
    position: "Associate Professor II, College of Engineering",
    role: "committee1",
  },
  {
    key: "c2",
    firstName: "Albert",
    middleName: "C.",
    lastName: "Sanico",
    email: "a.sanico@pit.edu.ph",
    employeeNo: "2013-0231",
    position: "Assistant Professor III, College of Education",
    role: "committee2",
  },
  {
    key: "chair",
    firstName: "Sansino Rian",
    middleName: "C.",
    lastName: "Guanzon",
    email: "s.guanzon@pit.edu.ph",
    employeeNo: "2009-0054",
    position: "Professor I, College of Arts and Sciences",
    role: "chair",
  },
  {
    key: "elena",
    firstName: "Elena",
    middleName: "B.",
    lastName: "Bautista",
    email: "e.bautista@pit.edu.ph",
    employeeNo: "2016-0198",
    position: "Instructor III, College of Education",
    role: "member",
  },
];

console.log("Creating member records…");
for (const person of ROSTER) {
  run("testing:seedMember", {
    firstName: person.firstName,
    lastName: person.lastName,
    email: person.email,
    role: person.role,
    isPermanent: person.isPermanent ?? true,
  });
}

console.log("Creating sign-in accounts…");
const session = {};
for (const person of ROSTER) {
  session[person.key] = await account(person.email);
  console.log(`  ${person.email}`);
}

/**
 * Co-maker choices are resolved per borrower: the eligible list excludes the
 * borrower themselves, so it differs for each account.
 */
async function coMaker(client, surname) {
  const eligible = await client.query(api.applications.eligibleCoMakers, {});
  const match = eligible.find((m) => m.name.includes(surname));
  if (match === undefined) {
    throw new Error(`no eligible co-maker matching "${surname}"`);
  }
  return match._id;
}

console.log("Filing loans…");

/**
 * A member may hold only one open loan, so each borrower's earlier loan is
 * carried to a terminal state before the next is filed.
 */

// 1. Elena: approved all the way, then released. Lands in the archive.
{
  const id = await session.elena.mutation(api.applications.submit, {
    coMakerMemberId: await coMaker(session.elena, "Cataraja"),
    loanType: "regular",
    loanAmount: 18000,
    deductionPerPayday: 1800,
  });
  await session.c1.mutation(api.applications.castDecision, {
    applicationId: id,
    decision: "approved",
    remarks: "Complete requirements. No outstanding balance.",
  });
  await session.c2.mutation(api.applications.castDecision, {
    applicationId: id,
    decision: "approved",
  });
  await session.chair.mutation(api.applications.castDecision, {
    applicationId: id,
    decision: "approved",
  });
  // The chair records the release, wearing the treasurer's hat.
  await session.chair.mutation(api.applications.recordRelease, {
    applicationId: id,
    releasedAmount: 18000,
    releasedAt: Date.now() - 86_400_000 * 12,
  });
  console.log("  released — Elena Bautista");
}

// 2. Elena again: disapproved by the committee. Also archived.
{
  const id = await session.elena.mutation(api.applications.submit, {
    coMakerMemberId: await coMaker(session.elena, "Sanico"),
    loanType: "emergency",
    loanAmount: 12000,
    deductionPerPayday: 1200,
  });
  await session.c1.mutation(api.applications.castDecision, {
    applicationId: id,
    decision: "rejected",
    remarks: "Co-maker already stands on two active loans.",
  });
  console.log("  disapproved — Elena Bautista");
}

// 3. Cataraja's own loan, sitting with the chair: the committee has passed it.
//    A committee member may borrow; they simply cannot decide on their own loan.
{
  const id = await session.c1.mutation(api.applications.submit, {
    coMakerMemberId: await coMaker(session.c1, "Sanico"),
    loanType: "regular",
    loanAmount: 12000,
    deductionPerPayday: 1200,
  });
  await session.c1.mutation(api.applications.castDecision, {
    applicationId: id,
    decision: "approved",
  });
  await session.c2.mutation(api.applications.castDecision, {
    applicationId: id,
    decision: "approved",
    remarks: "Verified with the payroll office.",
  });
  console.log("  with the chair — Geryl Cataraja");
}

// 4. Fresh, undecided, so the committee has something waiting on them.
{
  await session.c2.mutation(api.applications.submit, {
    coMakerMemberId: await coMaker(session.c2, "Cataraja"),
    loanType: "regular",
    loanAmount: 6000,
    deductionPerPayday: 600,
  });
  console.log("  with the committee — Albert Sanico");
}

for (const c of clients) await c.close();

console.log(`
Done. Sign in at http://localhost:3000/signin

  Chair, and treasurer   s.guanzon@pit.edu.ph
  Committee Member       g.cataraja@pit.edu.ph
  Committee Member       a.sanico@pit.edu.ph
  Borrower               e.bautista@pit.edu.ph

  Password for all       ${PASSWORD}
`);
