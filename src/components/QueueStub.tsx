/**
 * The queue stub — the one form in this interface that is purely of its subject.
 *
 * The workbook's whole purpose was to hand a member a loan number, and its
 * VLOOKUP returned #N/A instead. So the number is not a field in a table here;
 * it is a torn-off stub, the way a queue number arrives in a provincial office:
 * a mono figure large enough to read across a desk, with a perforated edge.
 *
 * `size="lg"` heads a detail page. `size="sm"` sits at the left of a queue row,
 * where a column of stubs reads as the queue itself.
 *
 * A claim number ("H26-0001") keeps its prefix on the spine with the year, so
 * a column of stubs still tells claims from loans at a glance.
 */
export function QueueStub({
  queueNumber,
  size = "sm",
  tone = "ink",
  label,
}: {
  queueNumber: string;
  size?: "sm" | "lg";
  tone?: "ink" | "viridian" | "muted";
  label?: string;
}) {
  const [year, seq] = queueNumber.split("-");
  const caption =
    label ?? (queueNumber.startsWith("H") ? "Claim number" : "Loan number");

  const palette = {
    ink: "border-ink/25 text-ink",
    viridian: "border-viridian/35 text-viridian",
    muted: "border-rule-strong text-ink-faint",
  }[tone];

  const large = size === "lg";

  return (
    <div
      className={`relative flex shrink-0 items-stretch border-y border-l ${palette}`}
      aria-label={`${caption} ${queueNumber}`}
    >
      {/* Year, set vertically along the spine like a filing tab. */}
      <div
        className={`flex items-center justify-center border-r border-current/25 ${
          large ? "px-1.5" : "px-1"
        }`}
      >
        <span
          className={`tnum font-mono font-medium tracking-[0.14em] ${
            large ? "text-[0.6875rem]" : "text-[0.5625rem]"
          }`}
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {year}
        </span>
      </div>

      <div className={large ? "px-4 py-2" : "px-2.5 py-1"}>
        <span
          className={`tnum block font-mono font-medium leading-none tracking-[-0.02em] ${
            large ? "text-[2.25rem]" : "text-base"
          }`}
        >
          {seq}
        </span>
        {large && (
          <span className="eyebrow mt-1.5 block text-current/55">{caption}</span>
        )}
      </div>

      {/* Torn edge: the stub was pulled from a pad. */}
      <div
        className={`perforated-r w-[7px] shrink-0 border-r border-current/25 ${
          large ? "" : ""
        }`}
        aria-hidden="true"
      />
    </div>
  );
}
