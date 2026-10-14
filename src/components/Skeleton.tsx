/**
 * Loading placeholders shaped like the content that is coming.
 *
 * A blank page with the word "Loading" in the middle reads as a broken page.
 * A shape reads as "nearly there", and because the skeleton occupies the same
 * space as the real content, nothing jumps when it arrives.
 */

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`skeleton h-3.5 ${className}`} />;
}

/** Matches the page header: eyebrow, title, rule. */
export function SkeletonHeader() {
  return (
    <div>
      <SkeletonLine className="w-20" />
      <SkeletonLine className="mt-3 h-6 w-56" />
      <hr className="mt-6 border-rule" />
    </div>
  );
}

/** Matches a list of loan rows. */
export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="mt-8 row-list">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-4">
          <div className="skeleton h-8 w-16 shrink-0" />
          <SkeletonLine className="w-40 flex-1" />
          <SkeletonLine className="hidden w-24 sm:block" />
          <div className="skeleton h-6 w-28 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Matches a table, including its header row. */
export function SkeletonTable({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="mt-7 overflow-hidden rounded-2xl border border-rule">
      <div className="flex gap-4 border-b border-rule-strong px-4 py-3">
        {Array.from({ length: columns }, (_, i) => (
          <SkeletonLine key={i} className="h-2.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 border-b border-rule px-4 py-3.5 last:border-b-0">
          {Array.from({ length: columns }, (_, c) => (
            <SkeletonLine key={c} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Matches an application detail page: stub, terms grid, decision rail. */
export function SkeletonDetail() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <SkeletonLine className="mb-7 w-28" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="skeleton h-16 w-40" />
        <div className="skeleton h-7 w-32 rounded-full" />
      </div>

      <hr className="mt-6 border-rule" />

      <SkeletonLine className="mt-7 w-16" />
      <div className="mt-3 grid gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="bg-leaf px-4 py-3.5">
            <SkeletonLine className="h-2.5 w-14" />
            <SkeletonLine className="mt-2.5 w-24" />
          </div>
        ))}
      </div>

      <SkeletonLine className="mt-9 w-20" />
      <div className="mt-4 space-y-6">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex gap-4">
            <div className="skeleton mt-1 h-2.5 w-2.5 shrink-0 rotate-45" />
            <div className="flex-1">
              <SkeletonLine className="w-36" />
              <SkeletonLine className="mt-2 h-2.5 w-56" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full-page placeholder: header plus rows. */
export function SkeletonPage({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <SkeletonHeader />
      <SkeletonRows count={rows} />
    </div>
  );
}
