import type { MutationCtx } from "../_generated/server";

/**
 * Asia/Manila is UTC+8 all year (the Philippines has had no DST since 1978).
 * Deriving the year straight from UTC would file a 1 Jan 00:30 PHT application
 * under the previous year, so shift into local time first. Hard-coding the
 * offset keeps a timezone library out of the Convex bundle.
 */
const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;

export function phtYear(timestamp: number): number {
  return new Date(timestamp + PHT_OFFSET_MS).getUTCFullYear();
}

/**
 * Loans and claims are numbered separately. Claims carry an "H" prefix
 * (hospitalization, and terminal illness with it) so a claim number can never
 * be mistaken for a loan number with the same digits: `26-0007` is a loan,
 * `H26-0007` a claim.
 */
export type QueueSeries = "loan" | "claim";

const PREFIX: Record<QueueSeries, string> = { loan: "", claim: "H" };

export function formatQueueNumber(
  year: number,
  seq: number,
  series: QueueSeries = "loan",
): string {
  const yy = String(year % 100).padStart(2, "0");
  return `${PREFIX[series]}${yy}-${String(seq).padStart(4, "0")}`;
}

/**
 * Allocates the next queue number in a series for the calendar year.
 *
 * Convex mutations are serialisable: if two submissions read the same counter
 * row, the loser's commit hits an OCC conflict and Convex re-runs the whole
 * mutation, re-reading the counter. A plain read-modify-write is therefore
 * safe — no locks, and no scanning for a maximum.
 *
 * The one rule this depends on: the caller MUST insert the application in the
 * same mutation. Splitting the allocation into its own mutation would let a
 * number be handed out and then dropped on a later failure.
 */
export async function nextQueueNumber(
  ctx: MutationCtx,
  now: number,
  series: QueueSeries = "loan",
) {
  const year = phtYear(now);

  // The loan series is stored with `series` absent, which is how every counter
  // written before claims existed looks, so those rows carry on unchanged.
  // Each (series, year) pair is its own row: a loan and a claim filed together
  // touch different rows and never conflict with each other.
  const stored = series === "loan" ? undefined : series;

  // A `.unique()` miss still joins the read set, so two mutations both finding
  // no row for a new year conflict and retry rather than double-inserting.
  const row = await ctx.db
    .query("counters")
    .withIndex("by_series_year", (q) => q.eq("series", stored).eq("year", year))
    .unique();

  let seq: number;
  if (row === null) {
    seq = 1;
    await ctx.db.insert(
      "counters",
      stored === undefined ? { year, lastSeq: seq } : { series: stored, year, lastSeq: seq },
    );
  } else {
    seq = row.lastSeq + 1;
    await ctx.db.patch(row._id, { lastSeq: seq });
  }

  return { year, seq, queueNumber: formatQueueNumber(year, seq, series) };
}
