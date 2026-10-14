import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import type { Metadata } from "next";
import { Inter_Tight, Roboto_Mono } from "next/font/google";
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

/**
 * Inter Tight throughout (Object White). Loaded as the variable font so the
 * featherweight display cut and the 500/600 UI weights come from one file.
 * Its tight, neutral letterforms let the figures and decisions carry the page.
 */
const sans = Inter_Tight({
  subsets: ["latin"],
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
  title: {
    default: "PIT Faculty Association",
    template: "%s · PIT Faculty Association",
  },
  description:
    "Loans and claims for members of the PIT Faculty Association, Palompon Institute of Technology.",
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
