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
  // Colour is reserved for states that call for action or record an outcome.
  // Waiting states stay neutral so a queue of them does not read as alarming.
  const tone =
    status === "archived" && outcome === "rejected"
      ? "border-oxide/30 bg-oxide-wash text-oxide"
      : status === "approved" || status === "released"
        ? "border-viridian/30 bg-viridian-wash text-viridian"
        : status === "archived"
          ? "border-rule-strong bg-black/[0.03] text-ink-pencil"
          : "border-rule-strong bg-black/[0.03] text-ink-pencil";

  return (
    <span className={`stamp ${tone}`}>{statusLabel(status, outcome)}</span>
  );
}
