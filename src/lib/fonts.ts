import { Inter_Tight } from "next/font/google";

/**
 * Inter Tight for the public pages only. Loaded as the variable font so the
 * featherweight display cut (250) and the 500/600 UI weights come from one
 * file. Imported by the pages that use it, so the signed-in app — which stays
 * on Poppins — never downloads it.
 */
export const objectFont = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-object",
  display: "swap",
});
