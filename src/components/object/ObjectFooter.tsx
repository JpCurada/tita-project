import Image from "next/image";
import { SOCIAL_LINKS } from "@/components/SiteFooter";

/**
 * The association's signature: seal, full name, where it is, and its own
 * channels. Social links are hairline circles, so they read as part of the
 * same object family as the medallion rather than as stickers.
 */
export function ObjectFooter() {
  return (
    <footer className="border-t border-ow-line/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
        <div className="flex items-center gap-4">
          <Image
            src="/pit-logo.png"
            alt="Palompon Institute of Technology seal"
            width={44}
            height={44}
            className="shrink-0"
          />
          <div className="leading-snug">
            <p className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
              PIT Faculty Association
            </p>
            <p className="text-[0.8125rem] text-ow-gray">
              Palompon Institute of Technology · Palompon, Leyte
            </p>
          </div>
        </div>

        <ul className="flex items-center gap-2.5" aria-label="The association elsewhere">
          {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${label} (opens in a new tab)`}
                title={label}
                className="grid h-10 w-10 place-items-center rounded-full border border-ow-line text-ow-gray
                           transition-[color,border-color,transform] duration-200 ease-out
                           hover:-translate-y-0.5 hover:border-ow-ink hover:text-ow-ink"
              >
                <Icon />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-1 border-t border-ow-line/50 px-4 py-5 text-xs text-ow-gray sm:flex-row sm:justify-between sm:px-8 lg:px-12">
        <p>© {new Date().getFullYear()} PIT Faculty Association. For members only.</p>
        <p>Palompon, Leyte, Philippines</p>
      </div>
    </footer>
  );
}
