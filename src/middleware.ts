import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

/** Pages for people who are not signed in yet: the landing page and sign-in. */
const isEntryPage = createRouteMatcher(["/", "/signin"]);

/**
 * `/api/auth` is the proxy the client posts sign-in and sign-up to; the
 * middleware itself answers it. Redirecting it would return the HTML sign-in
 * page to a caller expecting JSON.
 */
const isPublicRoute = createRouteMatcher(["/", "/signin", "/api/auth(.*)"]);

/**
 * Middleware only distinguishes signed-in from signed-out — it has no database
 * access, so it cannot check roles. Role enforcement lives in the Convex
 * functions; the admin layout adds a redirect purely for UX.
 */
export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isPublicRoute(request)) {
    if (isEntryPage(request) && (await convexAuth.isAuthenticated())) {
      return nextjsMiddlewareRedirect(request, "/dashboard");
    }
    return;
  }

  if (!(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/signin");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
