"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@convex/_generated/api";
import { CompleteProfile } from "@/components/CompleteProfile";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SiteFooter } from "@/components/SiteFooter";
import { SkeletonPage } from "@/components/Skeleton";
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

  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function leave() {
    setSigningOut(true);
    await signOut();
    router.push("/signin");
  }

  if (member === undefined) {
    // Chrome first, content after: the header is identical for every user, so
    // showing it immediately makes the app feel loaded while data arrives.
    return (
      <div className="flex min-h-screen flex-col">
        <div className="border-b border-rule-strong bg-leaf">
          <div className="mx-auto flex max-w-4xl items-center gap-2.5 px-5 py-4">
            <Image src="/pit-logo.png" alt="" width={34} height={34} priority />
            <div className="skeleton h-8 w-52" />
          </div>
        </div>
        <div className="mx-auto w-full max-w-4xl flex-1 px-5 py-9">
          <SkeletonPage />
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (member === null) {
    return <CompleteProfile onSignOut={() => void leave()} />;
  }

  const isStaff = STAFF_ROLES.includes(member.role);
  const isChair = member.role === "chair";
  const canRelease = member.role === "treasurer" || isChair;

  const links = [{ href: "/dashboard", label: "My loans" }];
  if (isStaff) {
    links.push({ href: "/queue", label: "Queue" });
    if (canRelease) links.push({ href: "/release", label: "Release" });
    links.push({ href: "/archive", label: "Archive" });
  }
  if (isChair) links.push({ href: "/members", label: "Members" });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-rule-strong bg-leaf">
        <div className="mx-auto max-w-4xl px-5">
          {/* Masthead. On a phone the institute line is dropped and the title
              shortened: the header should not eat a fifth of a small screen. */}
          <div className="flex items-center justify-between gap-3 pt-3.5">
            <Link
              href="/dashboard"
              className="group flex min-w-0 items-center gap-2.5"
            >
              <Image
                src="/pit-logo.png"
                alt=""
                width={32}
                height={32}
                className="shrink-0"
                priority
              />
              <span className="min-w-0">
                <span className="eyebrow hidden text-ink-faint sm:block">
                  Palompon Institute of Technology
                </span>
                <span className="block truncate font-display text-[0.9375rem] font-semibold text-ink transition-colors group-hover:text-viridian">
                  <span className="sm:hidden">PIT Faculty Association</span>
                  <span className="hidden sm:inline">
                    Faculty Association
                    <span className="font-normal text-ink-faint">
                      {" · "}Loan Committee
                    </span>
                  </span>
                </span>
              </span>
            </Link>

            <div className="flex shrink-0 items-center gap-4">
              <span className="hidden text-right sm:block">
                <span className="block text-sm leading-tight">{member.name}</span>
                <span className="eyebrow block text-ink-faint">
                  {roleTitle(member.role)}
                </span>
              </span>
              <button
                className="btn-quiet whitespace-nowrap"
                onClick={() => setConfirmingSignOut(true)}
              >
                Sign out
              </button>
            </div>
          </div>

          {/* Tabs sit on the rule, like index tabs on a ledger. */}
          <nav className="-mb-px flex gap-6 overflow-x-auto pt-4">
            {links.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`whitespace-nowrap border-b-2 pb-2 text-sm transition-colors ${
                    active
                      ? "border-viridian font-medium text-ink"
                      : "border-transparent text-ink-pencil hover:border-rule-strong hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main key={pathname} className="rise mx-auto w-full max-w-4xl flex-1 px-5 py-9">
        {children}
      </main>

      <SiteFooter />

      <ConfirmDialog
        open={confirmingSignOut}
        title="Sign out?"
        confirmLabel="Sign out"
        busy={signingOut}
        busyLabel="Signing out"
        onConfirm={() => void leave()}
        onCancel={() => setConfirmingSignOut(false)}
      >
        You will need your email and password to get back in. Nothing you have
        filed is lost.
      </ConfirmDialog>
    </div>
  );
}
