"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { api } from "@convex/_generated/api";
import { roleTitle } from "@/lib/format";

const STAFF_ROLES = ["committee1", "committee2", "chair", "treasurer"];

export function AppShell({ children }: { children: ReactNode }) {
  const member = useQuery(api.members.getCurrentMember);
  const claimProfile = useMutation(api.members.claimProfile);
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();

  // A member the chair pre-created has no userId until their first sign-in.
  // Attempt the link once, then let the query re-run.
  useEffect(() => {
    if (member === null) {
      void claimProfile().catch(() => {
        /* no matching profile — the pending screen explains what to do */
      });
    }
  }, [member, claimProfile]);

  if (member === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">
        Loading…
      </div>
    );
  }

  if (member === null) {
    return <PendingApproval onSignOut={() => void signOut().then(() => router.push("/signin"))} />;
  }

  const isStaff = STAFF_ROLES.includes(member.role);
  const isChair = member.role === "chair";
  const canRelease = member.role === "treasurer" || isChair;

  const links: { href: string; label: string }[] = [
    { href: "/dashboard", label: "My loans" },
  ];
  if (isStaff) {
    links.push({ href: "/queue", label: "Queue" });
    if (canRelease) links.push({ href: "/release", label: "Release" });
    links.push({ href: "/archive", label: "Archive" });
  }
  if (isChair) links.push({ href: "/members", label: "Members" });

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/dashboard" className="font-serif text-lg font-semibold">
            PIT FA Loans
          </Link>

          <nav className="flex flex-1 flex-wrap gap-1">
            {links.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-3 py-1.5 text-sm transition ${
                    active
                      ? "bg-stone-900 text-white"
                      : "text-ink-muted hover:bg-stone-100 hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-right sm:block">
              <span className="block font-medium leading-tight">{member.name}</span>
              <span className="block text-xs text-ink-muted">
                {roleTitle(member.role)}
              </span>
            </span>
            <button
              className="btn-secondary"
              onClick={() => void signOut().then(() => router.push("/signin"))}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

function PendingApproval({ onSignOut }: { onSignOut: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md p-8 text-center">
        <h1 className="font-serif text-xl font-semibold">Account not yet linked</h1>
        <p className="mt-3 text-sm text-ink-muted">
          Your sign-in works, but no faculty association membership is linked to
          this email address yet. Ask the Chair of the Loan Committee to add you,
          then sign in again.
        </p>
        <button className="btn-secondary mt-6" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </main>
  );
}
