import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import type { Metadata } from "next";
import { Inter_Tight, Newsreader, Roboto_Mono } from "next/font/google";
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

// Newsreader: a text-first serif with real ink traps — it reads like something
// set for print rather than a display face borrowed for a landing page.
const display = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

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
        className={`${display.variable} ${sans.variable} ${mono.variable}`}
      >
        <body className="font-sans">
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
