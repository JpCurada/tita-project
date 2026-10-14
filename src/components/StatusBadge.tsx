import { statusLabel, type Status } from "@/lib/format";

/**
 * A soft pill: tinted, borderless, sentence case. It names the state in
 * words; the tint only confirms it. Colour is doing real work here, so
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
      ? "border-transparent bg-oxide-wash text-oxide"
      : status === "approved" || status === "released"
        ? "border-transparent bg-viridian-wash text-viridian"
        : "border-transparent bg-bond text-ink-pencil";

  return (
    <span className={`stamp ${tone}`}>{statusLabel(status, outcome)}</span>
  );
}
