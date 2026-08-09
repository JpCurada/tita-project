"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@convex/_generated/api";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatPeso } from "@/lib/format";

type Filter = "all" | "approved" | "rejected";

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
        app.coMakerName.toLowerCase().includes(term)
      );
    });
  }, [archive, filter, search]);

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold">Archive</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Completed applications, read-only. Approved and disapproved alike.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          className="input max-w-xs"
          placeholder="Search loan number or name…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="flex gap-1">
          {(["all", "approved", "rejected"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`rounded-md px-3 py-1.5 text-sm capitalize transition ${
                filter === option
                  ? "bg-stone-900 text-white"
                  : "text-ink-muted hover:bg-stone-100"
              }`}
            >
              {option === "rejected" ? "disapproved" : option}
            </button>
          ))}
        </div>
      </div>

      {archive === undefined ? (
        <p className="mt-6 text-sm text-ink-muted">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="card mt-6 p-6 text-sm text-ink-muted">
          {archive.length === 0
            ? "Nothing has been archived yet."
            : "No applications match your search."}
        </p>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Loan no.</th>
                <th className="px-5 py-3 font-medium">Borrower</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Filed</th>
                <th className="px-5 py-3 font-medium">Result</th>
                <th className="px-5 py-3 font-medium">Form</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {visible.map((app) => (
                <tr key={app._id} className="hover:bg-stone-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/queue/${app._id}`}
                      className="font-mono font-medium underline-offset-2 hover:underline"
                    >
                      {app.queueNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{app.borrowerName}</td>
                  <td className="px-5 py-3">{formatPeso(app.loanAmount)}</td>
                  <td className="px-5 py-3 text-ink-muted">
                    {formatDate(app.dateFiled)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={app.status} outcome={app.outcome} />
                  </td>
                  <td className="px-5 py-3">
                    <a
                      href={`/api/applications/${app._id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink-muted underline-offset-2 hover:text-ink hover:underline"
                    >
                      PDF
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
