import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Bond paper and ledger ink, not UI grey.
        bond: "#F2EFE6",
        leaf: "#FBFAF6",
        rule: "#DAD4C4",
        "rule-strong": "#BCB4A0",
        ink: {
          DEFAULT: "#171614",
          pencil: "#6A6559",
          faint: "#918B7C",
        },
        // The treasurer's stamp pad. Used for the borrower's own thread.
        viridian: {
          DEFAULT: "#1D4E4A",
          wash: "#E4EDEA",
        },
        // Correction pen. Disapproval only.
        oxide: {
          DEFAULT: "#8C2F1E",
          wash: "#F6E7E2",
        },
        // Pending: the amber of an unstamped carbon copy.
        amber: {
          ledger: "#8A5A11",
          wash: "#F6EEDC",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        micro: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.08em" }],
      },
      borderRadius: {
        // Paper does not have a 12px radius.
        none: "0",
        sm: "2px",
        DEFAULT: "2px",
      },
      boxShadow: {
        // Paper lifted off paper, not a glow.
        leaf: "0 1px 0 0 #DAD4C4, 0 2px 6px -4px rgba(23,22,20,0.18)",
      },
      backgroundImage: {
        // Perforation for the queue stub's torn edge.
        perf: "radial-gradient(circle at 3px 50%, transparent 0 2.5px, currentColor 2.6px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
