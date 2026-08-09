"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ApplicationDetail } from "@/components/ApplicationDetail";

export default function MyApplicationPage() {
  const params = useParams<{ id: string }>();
  const application = useQuery(api.applications.getMine, {
    applicationId: params.id as Id<"applications">,
  });

  if (application === undefined) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  return (
    <div>
      <Link
        href="/dashboard"
        className="mb-6 inline-block text-sm text-ink-muted hover:text-ink"
      >
        ← Back to my loans
      </Link>
      <ApplicationDetail application={application} />
    </div>
  );
}
