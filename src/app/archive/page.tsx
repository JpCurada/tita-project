"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@convex/_generated/api";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatPeso } from "@/lib/format";
import { SkeletonTable } from "@/components/Skeleton";

type Filter = "all" | "approved" | "rejected";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Disapproved" },
];

export default function ArchivePage() {
  const archive = useQuery(api.applications.listArchive);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    if (archive === undefined) return [];
    const term = search.trim().toLowerCase();
    return archive.filter((app) => {
      if (filter !== "all" && app.outcome !== filter) return false;
      if (term === "") return true;
      return (
        app.queueNumber.toLowerCase().includes(term) ||
        app.borrowerName.toLowerCase().includes(term) ||
        // Claims have no co-maker.
        (app.coMakerName ?? "").toLowerCase().includes(term)
      );
    });
  }, [archive, filter, search]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Closed record</span>
          <h1 className="page-title mt-1.5">Archive</h1>
        </div>
        {archive !== undefined && (
          <p className="tnum font-mono text-sm text-ink-pencil">
            {visible.length}
            {visible.length !== archive.length && ` of ${archive.length}`}{" "}
            applications
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-rule-strong pb-3">
        <div className="flex gap-5">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className={`-mb-3 border-b-2 pb-3 text-sm transition-colors ${
                filter === option.value
                  ? "border-viridian font-medium text-ink"
                  : "border-transparent text-ink-pencil hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <input
          type="search"
          className="input max-w-56 border-b-0 py-1"
          placeholder="Search number or name"
          aria-label="Search the archive"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {archive === undefined ? (
        <SkeletonTable rows={5} columns={6} />
      ) : visible.length === 0 ? (
        <p className="mt-8 border border-dashed border-rule-strong px-5 py-12 text-center text-sm text-ink-pencil">
          {archive.length === 0
            ? "Nothing has been archived yet."
            : "Nothing matches that search."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="ledger">
            <caption className="sr-only">
              Archived loan and claim applications, most recent first
            </caption>
            <thead>
              <tr>
                <th scope="col">No.</th>
                <th scope="col">Borrower</th>
                <th scope="col" className="text-right">
                  Amount
                </th>
                <th scope="col">Filed</th>
                <th scope="col">Result</th>
                <th scope="col">
                  <span className="sr-only">Printable form</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((app) => (
                <tr key={app._id} className="transition-colors hover:bg-black/[0.02]">
                  <td>
                    <Link
                      href={`/queue/${app._id}`}
                      className="tnum font-mono text-sm font-medium underline decoration-rule-strong underline-offset-4 transition-colors hover:decoration-ink"
                    >
                      {app.queueNumber}
                    </Link>
                  </td>
                  <td>{app.borrowerName}</td>
                  <td className="tnum text-right font-mono">
                    {formatPeso(app.loanAmount)}
                  </td>
                  <td className="text-ink-pencil">{formatDate(app.dateFiled)}</td>
                  <td>
                    <StatusBadge status={app.status} outcome={app.outcome} />
                  </td>
                  <td className="text-right">
                    <a
                      href={`/api/applications/${app._id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-quiet"
                    >
                      Form
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
