/**
 * Runs a production build without disturbing a running dev server.
 *
 *   npm run build      # build into .next-build
 *   npm run start      # serve that build
 *
 * `next build` and `next dev` both default to `.next`, and the build clears it
 * before writing. Building while the dev server is up therefore deletes the
 * chunks it is serving, and the next request fails with "Cannot find module
 * './745.js'" or an ENOENT on a page — an error that reads like broken code but
 * is only a clobbered cache.
 *
 * Setting BUILD_DIR sends the build to `.next-build` instead, so the two never
 * touch. Vercel runs `next build` directly (see vercel.json), where BUILD_DIR
 * is unset and the default `.next` is used exactly as the platform expects.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const start = process.argv.includes("--start");
const next = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);

const child = spawn(process.execPath, [next, start ? "start" : "build"], {
  stdio: "inherit",
  env: { ...process.env, BUILD_DIR: ".next-build" },
});

child.on("exit", (code) => process.exit(code ?? 1));
