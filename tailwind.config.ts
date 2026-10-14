import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Object White: pure white, one ink, hairlines, and a single coloured
        // action taken from the seal's navy. The older names (bond, leaf,
        // ink, viridian...) are kept as aliases so every screen follows the
        // same system without renaming classes across the app.
        ow: {
          ink: "#1d1d1f",
          // Darkened from the reference's #86868b so body copy clears WCAG AA.
          gray: "#6e6e73",
          line: "#d2d2d7",
          mist: "#f5f5f7",
          accent: "#1a3d8f",
          "accent-hover": "#132f70",
        },
        bond: "#f5f5f7",
        leaf: "#ffffff",
        rule: "#e8e8ed",
        "rule-strong": "#d2d2d7",
        ink: {
          DEFAULT: "#1d1d1f",
          pencil: "#6e6e73",
          // The lightest text that still clears AA on white.
          faint: "#76767b",
        },
        // The action colour, and the borrower's own thread.
        viridian: {
          DEFAULT: "#1a3d8f",
          wash: "#eef2fb",
        },
        // Disapproval only.
        oxide: {
          DEFAULT: "#b3261e",
          wash: "#fdf0ee",
        },
        // Pending.
        amber: {
          ledger: "#8a5300",
          wash: "#fdf4e3",
        },
      },
      fontFamily: {
        display: ["var(--font-sans)", "Helvetica Neue", "Arial", "sans-serif"],
        sans: ["var(--font-sans)", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        object: ["var(--font-sans)", "Helvetica Neue", "Arial", "sans-serif"],
      },
      fontSize: {
        micro: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.08em" }],
      },
      boxShadow: {
        // Barely there at rest; a soft lift for things that float.
        leaf: "0 1px 2px rgba(0,0,0,0.04)",
        lift: "0 12px 32px -12px rgba(0,0,0,0.14), 0 2px 6px -2px rgba(0,0,0,0.06)",
      },
      backgroundImage: {
        // Perforation for the queue stub's torn edge.
        perf: "radial-gradient(circle at 3px 50%, transparent 0 2.5px, currentColor 2.6px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
