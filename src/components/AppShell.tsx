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

/**
 * A tab in the header. The current page is marked by an underline drawn on the
 * header's own bottom rule, so the tab reads as the front of the page beneath
 * it rather than as a highlighted button.
 */
function NavLink({
  href,
  label,
  pathname,
  compact = false,
}: {
  href: string;
  label: string;
  pathname: string;
  compact?: boolean;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center whitespace-nowrap rounded-t-md text-sm
                  transition-colors duration-150
                  ${compact ? "px-3 py-2.5" : "px-3.5"}
                  after:absolute after:inset-x-2 after:bottom-0 after:h-0.5
                  after:rounded-full after:transition-colors after:duration-150
                  ${
                    active
                      ? "font-semibold text-ink after:bg-viridian"
                      : "text-ink-pencil hover:bg-black/[0.03] hover:text-ink after:bg-transparent"
                  }`}
    >
      {label}
    </Link>
  );
}

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
          <div className="flex h-14 items-center gap-2.5 px-4 sm:px-6 lg:px-8">
            <Image src="/pit-logo.png" alt="" width={30} height={30} priority />
            <div className="skeleton h-7 w-48" />
            <div className="skeleton ml-auto h-7 w-24" />
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

  const links = [{ href: "/dashboard", label: "My applications" }];
  if (isStaff) {
    links.push({ href: "/queue", label: "Queue" });
    if (canRelease) links.push({ href: "/release", label: "Release" });
    links.push({ href: "/archive", label: "Archive" });
  }
  if (isChair) links.push({ href: "/members", label: "Members" });

  return (
    <div className="flex min-h-screen flex-col">
      {/* The bar runs the full width of the window and its contents sit at the
          window's own edges. Boxing the header to the content column left it
          stranded in the middle of a bar that already spanned everything. */}
      <header className="sticky top-0 z-30 border-b border-rule-strong bg-leaf/95 backdrop-blur">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center gap-4">
            <Link
              href="/dashboard"
              className="group flex min-w-0 items-center gap-2.5"
            >
              <Image
                src="/pit-logo.png"
                alt=""
                width={30}
                height={30}
                className="shrink-0"
                priority
              />
              <span className="min-w-0 leading-tight">
                <span className="eyebrow hidden text-ink-faint lg:block">
                  Palompon Institute of Technology
                </span>
                {/* The name is long for a phone header, so it may wrap to a
                    second line there rather than push the sign-out button off. */}
                <span className="block font-display text-[0.9375rem] font-semibold text-ink transition-colors group-hover:text-viridian">
                  Loan and Hospitalization Claim
                  <span className="hidden font-normal text-ink-faint xl:inline">
                    {" · "}PIT Faculty Association
                  </span>
                </span>
              </span>
            </Link>

            {/* Tabs sit beside the mark on a wide screen and drop to their own
                row below it on a narrow one, so neither ever truncates. */}
            <nav className="hidden h-full flex-1 items-stretch gap-1 md:flex">
              {links.map((link) => (
                <NavLink key={link.href} {...link} pathname={pathname} />
              ))}
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-3 md:ml-0">
              <span className="hidden text-right leading-tight sm:block">
                <span className="block text-sm font-medium">{member.name}</span>
                <span className="eyebrow block text-ink-faint">
                  {roleTitle(member.role)}
                </span>
              </span>
              <button
                className="btn-secondary px-3 py-1.5 text-xs"
                onClick={() => setConfirmingSignOut(true)}
              >
                Sign out
              </button>
            </div>
          </div>

          <nav className="-mx-1 flex items-stretch gap-1 overflow-x-auto border-t border-rule md:hidden">
            {links.map((link) => (
              <NavLink key={link.href} {...link} pathname={pathname} compact />
            ))}
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
