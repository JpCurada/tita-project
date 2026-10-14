"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ApplicationDetail } from "@/components/ApplicationDetail";
import { SkeletonDetail } from "@/components/Skeleton";

export default function MyApplicationPage() {
  const params = useParams<{ id: string }>();
  const application = useQuery(api.applications.getMine, {
    applicationId: params.id as Id<"applications">,
  });

  if (application === undefined) {
    return <SkeletonDetail />;
  }

  return (
    <div>
      <Link href="/dashboard" className="ow-link mb-7 text-sm font-medium">
        <span className="chev-back" aria-hidden="true">‹</span> My applications
      </Link>
      <ApplicationDetail application={application} />
    </div>
  );
}
