import { statusClasses, statusLabel, type Status } from "@/lib/format";

export function StatusBadge({
  status,
  outcome,
}: {
  status: Status;
  outcome?: "approved" | "rejected";
}) {
  return (
    <span className={`badge ${statusClasses(status, outcome)}`}>
      {statusLabel(status, outcome)}
    </span>
  );
}
