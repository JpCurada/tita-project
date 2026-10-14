import Image from "next/image";

/**
 * The same footer on every page, so the association's own channels are always
 * one click away — several members will reach this from a Facebook post rather
 * than by typing the address.
 */

export const SOCIAL_LINKS = [
  { href: "https://pit.edu.ph/", label: "pit.edu.ph", icon: Globe },
  {
    href: "https://www.facebook.com/PalomponInstituteOfTechnologyOfficial/",
    label: "Facebook",
    icon: Facebook,
  },
  {
    href: "https://www.linkedin.com/company/palompon-institute-of-technology/",
    label: "LinkedIn",
    icon: LinkedIn,
  },
];

export function SiteFooter({ tone = "light" }: { tone?: "light" | "dark" }) {
  const dark = tone === "dark";

  return (
    <footer
      className={`mt-auto border-t ${
        dark ? "border-leaf/15" : "border-rule"
      }`}
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-5 py-8 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          {!dark && (
            <Image
              src="/pit-logo.png"
              alt=""
              width={28}
              height={28}
              className="shrink-0"
            />
          )}
          <p
            className={`text-center text-xs leading-relaxed sm:text-left ${
              dark ? "text-leaf/45" : "text-ink-pencil"
            }`}
          >
            <span className="block font-medium">
              Loan and Hospitalization Claim · PIT Faculty Association
            </span>
            <span className={dark ? "text-leaf/30" : "text-ink-faint"}>
              Palompon Institute of Technology, Palompon, Leyte
            </span>
          </p>
        </div>

        <nav className="flex items-center gap-1">
          {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${label} (opens in a new tab)`}
              title={label}
              className={`grid h-9 w-9 place-items-center rounded-md transition-colors duration-150 ${
                dark
                  ? "text-leaf/45 hover:bg-leaf/10 hover:text-leaf"
                  : "text-ink-pencil hover:bg-black/[0.04] hover:text-viridian"
              }`}
            >
              <Icon />
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}

/* Icons are drawn at the hairline weight used elsewhere in the interface. */

function Globe() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7.5" />
      <path d="M2.5 10h15M10 2.5c1.9 2 3 4.7 3 7.5s-1.1 5.5-3 7.5c-1.9-2-3-4.7-3-7.5s1.1-5.5 3-7.5Z" />
    </svg>
  );
}

function Facebook() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M18 10a8 8 0 1 0-9.25 7.9v-5.59H6.72V10h2.03V8.24c0-2 1.19-3.11 3.02-3.11.88 0 1.79.16 1.79.16v1.97h-1.01c-.99 0-1.3.62-1.3 1.25V10h2.22l-.35 2.31h-1.87v5.59A8 8 0 0 0 18 10Z" />
    </svg>
  );
}

function LinkedIn() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M5.37 17V7.4H2.18V17h3.19ZM3.78 6.09c1.11 0 1.8-.74 1.8-1.66-.02-.94-.69-1.66-1.78-1.66S2 3.49 2 4.43c0 .92.69 1.66 1.76 1.66h.02ZM7.13 17h3.19v-5.36c0-.29.02-.57.11-.78.23-.57.75-1.16 1.63-1.16 1.15 0 1.61.88 1.61 2.16V17H16.85v-5.5c0-2.95-1.57-4.32-3.67-4.32-1.72 0-2.48.95-2.9 1.61h.02V7.4H7.13c.04.9 0 9.6 0 9.6Z" />
    </svg>
  );
}
