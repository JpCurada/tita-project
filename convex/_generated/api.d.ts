/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTPPasswordReset from "../ResendOTPPasswordReset.js";
import type * as ResendOTPSignUp from "../ResendOTPSignUp.js";
import type * as applications from "../applications.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_loan from "../lib/loan.js";
import type * as lib_queue from "../lib/queue.js";
import type * as members from "../members.js";
import type * as notifications from "../notifications.js";
import type * as notify from "../notify.js";
import type * as testing from "../testing.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTPPasswordReset: typeof ResendOTPPasswordReset;
  ResendOTPSignUp: typeof ResendOTPSignUp;
  applications: typeof applications;
  auth: typeof auth;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/loan": typeof lib_loan;
  "lib/queue": typeof lib_queue;
  members: typeof members;
  notifications: typeof notifications;
  notify: typeof notify;
  testing: typeof testing;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
