import { statusLabel, type Status } from "@/lib/format";

/**
 * A stamped mark rather than a pill: square, ruled, letterspaced — the way a
 * decision is recorded on the paper form. Colour is doing real work here, so
 * the label always states the status in words too.
 */
export function StatusBadge({
  status,
  outcome,
}: {
  status: Status;
  outcome?: "approved" | "rejected";
}) {
  const tone =
    status === "archived" && outcome === "rejected"
      ? "border-oxide/35 bg-oxide-wash text-oxide"
      : status === "approved" || status === "released"
        ? "border-viridian/30 bg-viridian-wash text-viridian"
        : status === "archived"
          ? "border-rule-strong bg-black/[0.03] text-ink-pencil"
          : status === "chair_review"
            ? "border-ink/25 bg-black/[0.04] text-ink"
            : "border-amber-ledger/30 bg-amber-wash text-amber-ledger";

  return (
    <span className={`stamp ${tone}`}>{statusLabel(status, outcome)}</span>
  );
}
