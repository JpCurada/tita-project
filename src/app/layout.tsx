import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import type { Metadata } from "next";
import { Poppins, Roboto_Mono } from "next/font/google";
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

/**
 * Poppins throughout. Its geometric, wide-aperture letterforms stay legible at
 * small sizes on the modest screens this will be used on, and the single family
 * across headings and UI keeps the interface calm — the loan figures are what
 * should stand out, not the typography.
 */
const sans = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// Poppins does the display work too, at heavier weights and tighter tracking,
// so --font-display simply points at the same family.

// Every queue number, peso amount and date is set in mono with tabular figures,
// so a column of them aligns exactly as it would in a ledger.
const mono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PIT FA Loans",
  description:
    "Loan applications for the PIT Faculty Association — Palompon Institute of Technology",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang="en"
        className={`${sans.variable} ${mono.variable}`}
      >
        <body className="font-sans">
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
