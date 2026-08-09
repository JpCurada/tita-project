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

export function formatQueueNumber(year: number, seq: number): string {
  const yy = String(year % 100).padStart(2, "0");
  return `${yy}-${String(seq).padStart(4, "0")}`;
}

/**
 * Allocates the next queue number for the calendar year.
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
export async function nextQueueNumber(ctx: MutationCtx, now: number) {
  const year = phtYear(now);

  // A `.unique()` miss still joins the read set, so two mutations both finding
  // no row for a new year conflict and retry rather than double-inserting.
  const row = await ctx.db
    .query("counters")
    .withIndex("by_year", (q) => q.eq("year", year))
    .unique();

  let seq: number;
  if (row === null) {
    seq = 1;
    await ctx.db.insert("counters", { year, lastSeq: seq });
  } else {
    seq = row.lastSeq + 1;
    await ctx.db.patch(row._id, { lastSeq: seq });
  }

  return { year, seq, queueNumber: formatQueueNumber(year, seq) };
}
