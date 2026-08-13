/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * Keep a local production build out of the dev server's directory.
   *
   * Both commands default to `.next`, and `next build` clears it before
   * writing. Building while `next dev` is running therefore deletes the files
   * the live server is serving, which surfaces as "Cannot find module
   * './745.js'" or an ENOENT on a page chunk — an error that reads like broken
   * code but is only a clobbered cache.
   *
   * `npm run build` sets BUILD_DIR so the build lands in `.next-build`. Vercel
   * runs plain `next build` with no BUILD_DIR, so deploys keep using `.next`
   * exactly as the platform expects.
   */
  distDir: process.env.BUILD_DIR ?? ".next",
};

export default nextConfig;
