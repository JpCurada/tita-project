"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Three columns — mark, sections, action — so the section links sit on the
 * page's true centre whatever the widths either side. It floats on white until
 * the page moves, then takes a hairline and a frosted backing, so it never
 * reads as a bar until it has something to separate from.
 */
export function ObjectNav({
  links = [],
  action,
}: {
  links?: { href: string; label: string }[];
  action?: React.ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled
          ? "border-ow-line/70 bg-white/80 backdrop-blur-xl backdrop-saturate-150"
          : "border-transparent bg-white"
      }`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto] items-center px-4 sm:px-8 md:grid-cols-[1fr_auto_1fr] lg:px-12"
      >
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 rounded"
          aria-label="PIT Faculty Association — home"
        >
          <Image
            src="/pit-logo.png"
            alt=""
            width={28}
            height={28}
            className="shrink-0"
            priority
          />
          <span className="truncate text-[0.9375rem] font-semibold tracking-[-0.01em] sm:text-[1.0625rem]">
            PIT Faculty Association
          </span>
        </Link>

        {links.length > 0 ? (
          <ul className="hidden items-center gap-8 md:flex">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="ow-navlink">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <span className="hidden md:block" />
        )}

        <div className="flex justify-end">{action}</div>
      </nav>
    </header>
  );
}
