/**
 * End-to-end verification against a real Convex deployment.
 *
 * Creates genuine password accounts for each role, then drives the public API
 * exactly as the browser would — so the role wrappers, the state machine and
 * the queue counter are all exercised for real, not mocked.
 *
 *   node scripts/verify.mjs --wipe
 *
 * DESTRUCTIVE. Every member, application and approval on the target deployment
 * is deleted before the run, so `--wipe` is required to say you meant it. Run
 * `node scripts/seed.mjs --reset` afterwards to put the roster back.
 */
import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = /NEXT_PUBLIC_CONVEX_URL=(.+)/.exec(env)?.[1].trim();
if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL missing from .env.local");

// Deleting the roster is the first thing this script does, and the loss is not
// obvious afterwards — the app still signs you in, then reports no membership.
// So the wipe has to be asked for, and never on production.
const deployment = /CONVEX_DEPLOYMENT=(.+)/.exec(env)?.[1].trim() ?? "";
if (!deployment.startsWith("dev:")) {
  console.error(
    `Refusing to run: ${deployment || "this deployment"} is not a dev deployment.\n` +
      "This script deletes all members, applications and approvals.",
  );
  process.exit(1);
}
if (!process.argv.includes("--wipe")) {
  console.error(
    "This deletes every member, application and approval on " +
      `${deployment}.\n` +
      "Re-run with --wipe if that is what you want, then restore the roster:\n" +
      "  node scripts/verify.mjs --wipe && node scripts/seed.mjs --reset",
  );
  process.exit(1);
}

/**
 * `internal*` functions are deliberately unreachable from any client — that is
 * the point of them — so the test harness reaches them the same way an operator
 * would: through the authenticated CLI.
 */
const admin = {
  run(name, args = {}) {
    // Invoke the CLI's JS entrypoint with node directly: `shell: true` would
    // strip the quotes out of the JSON argument on Windows, and Node refuses to
    // spawn npx.cmd without a shell.
    const cli = fileURLToPath(
      new URL("../node_modules/convex/bin/main.js", import.meta.url),
    );
    const output = execFileSync(
      process.execPath,
      [cli, "run", name, JSON.stringify(args)],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ).trim();
    if (output === "") return null;
    try {
      return JSON.parse(output);
    } catch {
      return output;
    }
  },
};

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Asserts a call is rejected, and that it fails for the expected reason. */
async function expectRejected(name, promise, expectedFragment) {
  try {
    await promise;
    check(name, false, "call unexpectedly succeeded");
  } catch (error) {
    const message = String(error.data ?? error.message ?? error);
    const matched =
      expectedFragment === undefined ||
      message.toLowerCase().includes(expectedFragment.toLowerCase());
    check(name, matched, matched ? "" : `got: ${message}`);
  }
}

/** Signs up a password account and returns a client authenticated as them. */
async function signUp(email, password) {
  const client = new ConvexClient(url);
  const result = await client.action(api.auth.signIn, {
    provider: "password",
    params: { email, password, flow: "signUp" },
  });
  const token = result?.tokens?.token;
  if (!token) throw new Error(`sign-up failed for ${email}`);
  client.setAuth(async () => token);
  return client;
}

const stamp = Date.now();
const clients = [];

try {
  console.log("\nResetting test data…");
  admin.run("testing:reset");

  /* ---------------------------------------------------------------- */
  console.log("\n1. Queue numbers");

  const sequential = admin.run("testing:allocateQueueNumbers", { count: 50 });
  const year = String(new Date().getFullYear() % 100).padStart(2, "0");
  check(
    "50 sequential allocations are gapless and correctly formatted",
    sequential.every((q, i) => q === `${year}-${String(i + 1).padStart(4, "0")}`),
    `first=${sequential[0]} last=${sequential.at(-1)}`,
  );

  // Genuine parallelism is tested further down, via 20 real members submitting
  // applications simultaneously through the public API (section 10).

  /* ---------------------------------------------------------------- */
  console.log("\n2. Accounts and profiles");

  admin.run("testing:reset");

  const people = [
    ["borrower", "Juan", "Dela Cruz", "member", true],
    ["comaker", "Maria", "Santos", "member", true],
    ["probationary", "Pedro", "Reyes", "member", false],
    ["c1", "Geryl", "Cataraja", "committee1", true],
    ["c2", "Albert", "Sanico", "committee2", true],
    ["chair", "Sansino", "Guanzon", "chair", true],
    ["treasurer", "Rosa", "Lim", "treasurer", true],
    ["outsider", "Nena", "Cruz", "member", true],
  ];

  const session = {};
  for (const [key, firstName, lastName, role, isPermanent] of people) {
    const email = `${key}.${stamp}@pit.test`;
    admin.run("testing:seedMember", {
      firstName,
      lastName,
      email,
      role,
      isPermanent,
    });
    const client = await signUp(email, "TestPassword123!");
    clients.push(client);
    await client.mutation(api.members.claimProfile, {});
    session[key] = client;
  }

  const me = await session.borrower.query(api.members.getCurrentMember, {});
  check("signed-up account links to its pre-created profile", me?.name === "Juan Dela Cruz");

  /* ---------------------------------------------------------------- */
  console.log("\n3. Submission validation");

  const coMakers = await session.borrower.query(api.applications.eligibleCoMakers, {});
  const maria = coMakers.find((m) => m.name === "Maria Santos");
  check("permanent members are offered as co-makers", maria !== undefined);
  check(
    "probationary members are excluded from co-makers",
    !coMakers.some((m) => m.name === "Pedro Reyes"),
  );
  check(
    "you are not offered as your own co-maker",
    !coMakers.some((m) => m.name === "Juan Dela Cruz"),
  );

  await expectRejected(
    "mismatched amount/deduction is rejected",
    session.borrower.mutation(api.applications.submit, {
      coMakerMemberId: maria._id,
      loanType: "regular",
      loanAmount: 6000,
      deductionPerPayday: 1800,
    }),
    "deduction",
  );

  await expectRejected(
    "a probationary member cannot be named co-maker",
    session.borrower.mutation(api.applications.submit, {
      coMakerMemberId: (
        admin.run("testing:seedMember", {
          firstName: "Temp",
          lastName: "Probationary",
          email: `temp.${stamp}@pit.test`,
          role: "member",
          isPermanent: false,
        })
      ),
      loanType: "regular",
      loanAmount: 6000,
      deductionPerPayday: 600,
    }),
    "permanent status",
  );

  const applicationId = await session.borrower.mutation(api.applications.submit, {
    coMakerMemberId: maria._id,
    loanType: "regular",
    loanAmount: 12000,
    deductionPerPayday: 1200,
  });
  check("valid application submits", typeof applicationId === "string");

  const filed = await session.borrower.query(api.applications.getMine, { applicationId });
  check("queue number issued on submit", /^\d{2}-\d{4}$/.test(filed.queueNumber));
  check("status starts as pending", filed.status === "pending");
  check("start date is not set at submission", filed.startDate === undefined);

  await expectRejected(
    "a second concurrent application is refused",
    session.borrower.mutation(api.applications.submit, {
      coMakerMemberId: maria._id,
      loanType: "regular",
      loanAmount: 6000,
      deductionPerPayday: 600,
    }),
    "already have",
  );

  /* ---------------------------------------------------------------- */
  console.log("\n4. Authorization");

  await expectRejected(
    "an ordinary member cannot cast a decision",
    session.outsider.mutation(api.applications.castDecision, {
      applicationId,
      decision: "approved",
    }),
    "not allowed",
  );

  await expectRejected(
    "the treasurer cannot cast a decision",
    session.treasurer.mutation(api.applications.castDecision, {
      applicationId,
      decision: "approved",
    }),
    "not allowed",
  );

  await expectRejected(
    "an ordinary member cannot read the staff queue",
    session.outsider.query(api.applications.listQueue, {}),
    "not allowed",
  );

  await expectRejected(
    "a member cannot read another member's application",
    session.outsider.query(api.applications.getMine, { applicationId }),
    "not found",
  );

  await expectRejected(
    "a non-chair cannot list members",
    session.c1.query(api.members.list, {}),
    "not allowed",
  );

  await expectRejected(
    "a non-chair cannot change roles",
    session.c1.mutation(api.members.setRole, {
      memberId: maria._id,
      role: "chair",
    }),
    "not allowed",
  );

  /* ---------------------------------------------------------------- */
  console.log("\n5. Approval state machine");

  await expectRejected(
    "the chair cannot decide before the committee",
    session.chair.mutation(api.applications.castDecision, {
      applicationId,
      decision: "approved",
    }),
    "not yet ready",
  );

  await session.c1.mutation(api.applications.castDecision, {
    applicationId,
    decision: "approved",
  });
  let state = admin.run("testing:getApplication", { applicationId }, "query");
  check("one committee approval leaves it pending", state.status === "pending");

  await expectRejected(
    "the same approver cannot vote twice",
    session.c1.mutation(api.applications.castDecision, {
      applicationId,
      decision: "approved",
    }),
    "already recorded",
  );

  await session.c2.mutation(api.applications.castDecision, {
    applicationId,
    decision: "approved",
  });
  state = admin.run("testing:getApplication", { applicationId }, "query");
  check("both committee approvals advance to chair review", state.status === "chair_review");
  check("exactly two approval rows exist", state.approvalCount === 2);

  await expectRejected(
    "committee voting is closed after advancing",
    session.c1.mutation(api.applications.castDecision, {
      applicationId,
      decision: "rejected",
      remarks: "Reaching the stage gate, not the reason check.",
    }),
    "closed",
  );

  await session.chair.mutation(api.applications.castDecision, {
    applicationId,
    decision: "approved",
  });
  state = admin.run("testing:getApplication", { applicationId }, "query");
  check("chair approval sets status to approved", state.status === "approved");
  check("chair approval fixes the start date", typeof state.startDate === "number");

  const frozenStart = state.startDate;

  /* ---------------------------------------------------------------- */
  console.log("\n6. Release and archive");

  await expectRejected(
    "an ordinary member cannot record a release",
    session.outsider.mutation(api.applications.recordRelease, {
      applicationId,
      releasedAmount: 12000,
      releasedAt: Date.now(),
    }),
    "not allowed",
  );

  await session.treasurer.mutation(api.applications.recordRelease, {
    applicationId,
    releasedAmount: 12000,
    releasedAt: Date.now(),
  });
  state = admin.run("testing:getApplication", { applicationId }, "query");
  check("release archives the application", state.status === "archived");
  check("archived approved loan records outcome=approved", state.outcome === "approved");
  check("start date is unchanged by release", state.startDate === frozenStart);

  await expectRejected(
    "an archived loan cannot be released twice",
    session.treasurer.mutation(api.applications.recordRelease, {
      applicationId,
      releasedAmount: 12000,
      releasedAt: Date.now(),
    }),
    "approved application",
  );

  /* ---------------------------------------------------------------- */
  console.log("\n7. Rejection path");

  const secondId = await session.borrower.mutation(api.applications.submit, {
    coMakerMemberId: maria._id,
    loanType: "emergency",
    loanAmount: 6000,
    deductionPerPayday: 600,
  });

  await expectRejected(
    "disapproving without a reason is refused",
    session.c1.mutation(api.applications.castDecision, {
      applicationId: secondId,
      decision: "rejected",
    }),
    "reason",
  );
  await expectRejected(
    "a blank reason is refused too",
    session.c1.mutation(api.applications.castDecision, {
      applicationId: secondId,
      decision: "rejected",
      remarks: "   ",
    }),
    "reason",
  );

  await session.c1.mutation(api.applications.castDecision, {
    applicationId: secondId,
    decision: "rejected",
    remarks: "Outstanding balance on a previous loan.",
  });
  state = admin.run("testing:getApplication", { applicationId: secondId }, "query");
  check("a rejection archives immediately", state.status === "archived");
  check("rejection is recorded as outcome=rejected", state.outcome === "rejected");
  check("a rejected loan never gets a start date", state.startDate === undefined);

  await expectRejected(
    "the second committee member cannot vote after a rejection",
    session.c2.mutation(api.applications.castDecision, {
      applicationId: secondId,
      decision: "approved",
    }),
    "closed",
  );

  await expectRejected(
    "the chair cannot vote after a rejection",
    session.chair.mutation(api.applications.castDecision, {
      applicationId: secondId,
      decision: "approved",
    }),
    "not yet ready",
  );

  const archive = await session.chair.query(api.applications.listArchive, {});
  check("archive contains both finished applications", archive.length === 2);
  check(
    "archive distinguishes approved from rejected",
    archive.filter((a) => a.outcome === "approved").length === 1 &&
      archive.filter((a) => a.outcome === "rejected").length === 1,
  );

  /* ---------------------------------------------------------------- */
  console.log("\n8. Concurrent committee votes");

  const thirdId = await session.borrower.mutation(api.applications.submit, {
    coMakerMemberId: maria._id,
    loanType: "regular",
    loanAmount: 18000,
    deductionPerPayday: 1800,
  });

  await Promise.all([
    session.c1.mutation(api.applications.castDecision, {
      applicationId: thirdId,
      decision: "approved",
    }),
    session.c2.mutation(api.applications.castDecision, {
      applicationId: thirdId,
      decision: "approved",
    }),
  ]);
  state = admin.run("testing:getApplication", { applicationId: thirdId }, "query");
  check(
    "simultaneous committee approvals still advance exactly once",
    state.status === "chair_review",
    `status=${state.status}`,
  );
  check("simultaneous votes record exactly two rows", state.approvalCount === 2);

  /* ---------------------------------------------------------------- */
  console.log("\n9. Printable form access");

  await expectRejected(
    "an undecided application cannot be printed",
    session.borrower.query(api.applications.getForPrint, { applicationId: thirdId }),
    "decided",
  );

  const printable = await session.borrower.query(api.applications.getForPrint, {
    applicationId,
  });
  check("the borrower can print their decided form", printable.queueNumber !== undefined);
  check(
    "the form carries the real approver names from the audit trail",
    printable.decisions.some((d) => d.approverName === "Geryl Cataraja") &&
      printable.decisions.some((d) => d.approverName === "Sansino Guanzon"),
  );

  await expectRejected(
    "an unrelated member cannot print someone else's form",
    session.outsider.query(api.applications.getForPrint, { applicationId }),
    "not found",
  );

  /* ---------------------------------------------------------------- */
  console.log("\n10. Concurrent submissions (real parallel clients)");

  const racers = [];
  for (let i = 0; i < 20; i++) {
    const email = `racer${i}.${stamp}@pit.test`;
    admin.run("testing:seedMember", {
      firstName: `Racer${i}`,
      lastName: "Test",
      email,
      role: "member",
      isPermanent: true,
    });
    const client = await signUp(email, "TestPassword123!");
    clients.push(client);
    await client.mutation(api.members.claimProfile, {});
    racers.push(client);
  }

  // All 20 fire at once against the same per-year counter row.
  const ids = await Promise.all(
    racers.map((client) =>
      client.mutation(api.applications.submit, {
        coMakerMemberId: maria._id,
        loanType: "regular",
        loanAmount: 6000,
        deductionPerPayday: 600,
      }),
    ),
  );

  const issued = await Promise.all(
    ids.map(async (id, i) => {
      const app = await racers[i].query(api.applications.getMine, {
        applicationId: id,
      });
      return app.queueNumber;
    }),
  );

  check(
    "20 simultaneous submissions all receive a queue number",
    issued.every((q) => /^\d{2}-\d{4}$/.test(q)),
  );
  check(
    "20 simultaneous submissions produce 20 distinct queue numbers",
    new Set(issued).size === 20,
    `distinct=${new Set(issued).size}`,
  );

  const seqs = issued.map((q) => Number(q.split("-")[1])).sort((a, b) => a - b);
  check(
    "concurrently issued numbers are gapless",
    seqs.every((n, i) => i === 0 || n === seqs[i - 1] + 1),
    `range ${seqs[0]}..${seqs.at(-1)}`,
  );
} finally {
  for (const client of clients) await client.close();
}

console.log(`\n${"=".repeat(46)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log("=".repeat(46));
process.exit(failed === 0 ? 0 : 1);
