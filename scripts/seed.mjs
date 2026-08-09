/**
 * Seeds a working association: a chair, the two committee members, a
 * treasurer, and ordinary members — plus loans at each stage of the flow.
 *
 *   node scripts/seed.mjs                 # keeps existing data
 *   node scripts/seed.mjs --reset         # wipes first
 *
 * Everything goes through the public API, so the seeded state is reachable
 * the same way the app would produce it.
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

// The real account, as chair. Everyone else is fictional but plausible for a
// provincial state college faculty association.
const ROSTER = [
  {
    key: "chair",
    firstName: "John Paul",
    lastName: "Curada",
    email: "johncurada.02@gmail.com",
    employeeNo: "2019-0142",
    position: "Instructor I, College of Computer Studies",
    role: "chair",
  },
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
    key: "treasurer",
    firstName: "Sansino Rian",
    middleName: "C.",
    lastName: "Guanzon",
    email: "s.guanzon@pit.edu.ph",
    employeeNo: "2009-0054",
    position: "Professor I, College of Arts and Sciences",
    role: "treasurer",
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
  {
    key: "ramon",
    firstName: "Ramon",
    middleName: "V.",
    lastName: "Villanueva",
    email: "r.villanueva@pit.edu.ph",
    employeeNo: "2014-0163",
    position: "Assistant Professor I, College of Engineering",
    role: "member",
  },
  {
    key: "teresita",
    firstName: "Teresita",
    middleName: "O.",
    lastName: "Ocampo",
    email: "t.ocampo@pit.edu.ph",
    employeeNo: "2008-0031",
    position: "Professor II, College of Computer Studies",
    role: "member",
  },
  {
    key: "marisol",
    firstName: "Marisol",
    middleName: "P.",
    lastName: "Delgado",
    email: "m.delgado@pit.edu.ph",
    employeeNo: "2021-0276",
    position: "Instructor I, College of Arts and Sciences",
    role: "member",
    isPermanent: false, // probationary: cannot stand as co-maker
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

// 1. Fully settled: approved all the way and released.
{
  const id = await session.teresita.mutation(api.applications.submit, {
    coMakerMemberId: await coMaker(session.teresita, "Villanueva"),
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
  await session.treasurer.mutation(api.applications.recordRelease, {
    applicationId: id,
    releasedAmount: 18000,
    releasedAt: Date.now() - 86_400_000 * 12,
  });
  console.log("  released — Teresita Ocampo");
}

// 2. Disapproved at the committee stage.
{
  const id = await session.ramon.mutation(api.applications.submit, {
    coMakerMemberId: await coMaker(session.ramon, "Bautista"),
    loanType: "emergency",
    loanAmount: 12000,
    deductionPerPayday: 1200,
  });
  await session.c1.mutation(api.applications.castDecision, {
    applicationId: id,
    decision: "rejected",
    remarks: "Co-maker already stands on two active loans.",
  });
  console.log("  disapproved — Ramon Villanueva");
}

// 3. Waiting on the chair: both committee members have approved.
{
  const id = await session.elena.mutation(api.applications.submit, {
    coMakerMemberId: await coMaker(session.elena, "Ocampo"),
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
  console.log("  with the chair — Elena Bautista");
}

// 4. Fresh: nobody has decided yet, so the committee has something waiting.
{
  await session.marisol.mutation(api.applications.submit, {
    coMakerMemberId: await coMaker(session.marisol, "Villanueva"),
    loanType: "regular",
    loanAmount: 6000,
    deductionPerPayday: 600,
  });
  console.log("  with the committee — Marisol Delgado");
}

for (const c of clients) await c.close();

console.log(`
Done. Sign in at http://localhost:3117/signin

  Chair (full access)   johncurada.02@gmail.com
  Committee Member 1    g.cataraja@pit.edu.ph
  Committee Member 2    a.sanico@pit.edu.ph
  Treasurer             s.guanzon@pit.edu.ph
  Ordinary member       e.bautista@pit.edu.ph

  Password for all      ${PASSWORD}
`);
