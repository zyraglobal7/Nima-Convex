/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_aiActions from "../admin/aiActions.js";
import type * as admin_analytics from "../admin/analytics.js";
import type * as admin_items from "../admin/items.js";
import type * as admin_migrations from "../admin/migrations.js";
import type * as admin_queries from "../admin/queries.js";
import type * as cart_mutations from "../cart/mutations.js";
import type * as cart_queries from "../cart/queries.js";
import type * as chat_actions from "../chat/actions.js";
import type * as chat_mutations from "../chat/mutations.js";
import type * as chat_queries from "../chat/queries.js";
import type * as crons from "../crons.js";
import type * as directMessages_mutations from "../directMessages/mutations.js";
import type * as directMessages_queries from "../directMessages/queries.js";
import type * as friends_mutations from "../friends/mutations.js";
import type * as friends_queries from "../friends/queries.js";
import type * as http from "../http.js";
import type * as itemTryOns_mutations from "../itemTryOns/mutations.js";
import type * as itemTryOns_queries from "../itemTryOns/queries.js";
import type * as items_likes from "../items/likes.js";
import type * as items_mutations from "../items/mutations.js";
import type * as items_queries from "../items/queries.js";
import type * as lib_rateLimiter from "../lib/rateLimiter.js";
import type * as lib_sanitize from "../lib/sanitize.js";
import type * as lookInteractions_index from "../lookInteractions/index.js";
import type * as lookInteractions_mutations from "../lookInteractions/mutations.js";
import type * as lookInteractions_queries from "../lookInteractions/queries.js";
import type * as lookbooks_mutations from "../lookbooks/mutations.js";
import type * as lookbooks_queries from "../lookbooks/queries.js";
import type * as looks_mutations from "../looks/mutations.js";
import type * as looks_queries from "../looks/queries.js";
import type * as messages_mutations from "../messages/mutations.js";
import type * as messages_queries from "../messages/queries.js";
import type * as orders_mutations from "../orders/mutations.js";
import type * as orders_queries from "../orders/queries.js";
import type * as search_visualSearch from "../search/visualSearch.js";
import type * as sellers_actions from "../sellers/actions.js";
import type * as sellers_mutations from "../sellers/mutations.js";
import type * as sellers_queries from "../sellers/queries.js";
import type * as threads_mutations from "../threads/mutations.js";
import type * as threads_queries from "../threads/queries.js";
import type * as types from "../types.js";
import type * as userImages_mutations from "../userImages/mutations.js";
import type * as userImages_queries from "../userImages/queries.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";
import type * as webhooks_workos from "../webhooks/workos.js";
import type * as workflows_actions from "../workflows/actions.js";
import type * as workflows_index from "../workflows/index.js";
import type * as workflows_itemTryOn from "../workflows/itemTryOn.js";
import type * as workflows_mutations from "../workflows/mutations.js";
import type * as workflows_onboarding from "../workflows/onboarding.js";
import type * as workflows_queries from "../workflows/queries.js";
import type * as wrapped_actions from "../wrapped/actions.js";
import type * as wrapped_constants from "../wrapped/constants.js";
import type * as wrapped_internalQueries from "../wrapped/internalQueries.js";
import type * as wrapped_mutations from "../wrapped/mutations.js";
import type * as wrapped_queries from "../wrapped/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/aiActions": typeof admin_aiActions;
  "admin/analytics": typeof admin_analytics;
  "admin/items": typeof admin_items;
  "admin/migrations": typeof admin_migrations;
  "admin/queries": typeof admin_queries;
  "cart/mutations": typeof cart_mutations;
  "cart/queries": typeof cart_queries;
  "chat/actions": typeof chat_actions;
  "chat/mutations": typeof chat_mutations;
  "chat/queries": typeof chat_queries;
  crons: typeof crons;
  "directMessages/mutations": typeof directMessages_mutations;
  "directMessages/queries": typeof directMessages_queries;
  "friends/mutations": typeof friends_mutations;
  "friends/queries": typeof friends_queries;
  http: typeof http;
  "itemTryOns/mutations": typeof itemTryOns_mutations;
  "itemTryOns/queries": typeof itemTryOns_queries;
  "items/likes": typeof items_likes;
  "items/mutations": typeof items_mutations;
  "items/queries": typeof items_queries;
  "lib/rateLimiter": typeof lib_rateLimiter;
  "lib/sanitize": typeof lib_sanitize;
  "lookInteractions/index": typeof lookInteractions_index;
  "lookInteractions/mutations": typeof lookInteractions_mutations;
  "lookInteractions/queries": typeof lookInteractions_queries;
  "lookbooks/mutations": typeof lookbooks_mutations;
  "lookbooks/queries": typeof lookbooks_queries;
  "looks/mutations": typeof looks_mutations;
  "looks/queries": typeof looks_queries;
  "messages/mutations": typeof messages_mutations;
  "messages/queries": typeof messages_queries;
  "orders/mutations": typeof orders_mutations;
  "orders/queries": typeof orders_queries;
  "search/visualSearch": typeof search_visualSearch;
  "sellers/actions": typeof sellers_actions;
  "sellers/mutations": typeof sellers_mutations;
  "sellers/queries": typeof sellers_queries;
  "threads/mutations": typeof threads_mutations;
  "threads/queries": typeof threads_queries;
  types: typeof types;
  "userImages/mutations": typeof userImages_mutations;
  "userImages/queries": typeof userImages_queries;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
  "webhooks/workos": typeof webhooks_workos;
  "workflows/actions": typeof workflows_actions;
  "workflows/index": typeof workflows_index;
  "workflows/itemTryOn": typeof workflows_itemTryOn;
  "workflows/mutations": typeof workflows_mutations;
  "workflows/onboarding": typeof workflows_onboarding;
  "workflows/queries": typeof workflows_queries;
  "wrapped/actions": typeof wrapped_actions;
  "wrapped/constants": typeof wrapped_constants;
  "wrapped/internalQueries": typeof wrapped_internalQueries;
  "wrapped/mutations": typeof wrapped_mutations;
  "wrapped/queries": typeof wrapped_queries;
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

export declare const components: {
  workflow: {
    event: {
      create: FunctionReference<
        "mutation",
        "internal",
        { name: string; workflowId: string },
        string
      >;
      send: FunctionReference<
        "mutation",
        "internal",
        {
          eventId?: string;
          name?: string;
          result:
            | { kind: "success"; returnValue: any }
            | { error: string; kind: "failed" }
            | { kind: "canceled" };
          workflowId?: string;
          workpoolOptions?: {
            defaultRetryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
            retryActionsByDefault?: boolean;
          };
        },
        string
      >;
    };
    journal: {
      load: FunctionReference<
        "query",
        "internal",
        { shortCircuit?: boolean; workflowId: string },
        {
          blocked?: boolean;
          journalEntries: Array<{
            _creationTime: number;
            _id: string;
            step:
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  functionType: "query" | "mutation" | "action";
                  handle: string;
                  inProgress: boolean;
                  kind?: "function";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workId?: string;
                }
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  handle: string;
                  inProgress: boolean;
                  kind: "workflow";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workflowId?: string;
                }
              | {
                  args: { eventId?: string };
                  argsSize: number;
                  completedAt?: number;
                  eventId?: string;
                  inProgress: boolean;
                  kind: "event";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                };
            stepNumber: number;
            workflowId: string;
          }>;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          ok: boolean;
          workflow: {
            _creationTime: number;
            _id: string;
            args: any;
            generationNumber: number;
            logLevel?: any;
            name?: string;
            onComplete?: { context?: any; fnHandle: string };
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt?: any;
            state?: any;
            workflowHandle: string;
          };
        }
      >;
      startSteps: FunctionReference<
        "mutation",
        "internal",
        {
          generationNumber: number;
          steps: Array<{
            retry?:
              | boolean
              | { base: number; initialBackoffMs: number; maxAttempts: number };
            schedulerOptions?: { runAt?: number } | { runAfter?: number };
            step:
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  functionType: "query" | "mutation" | "action";
                  handle: string;
                  inProgress: boolean;
                  kind?: "function";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workId?: string;
                }
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  handle: string;
                  inProgress: boolean;
                  kind: "workflow";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workflowId?: string;
                }
              | {
                  args: { eventId?: string };
                  argsSize: number;
                  completedAt?: number;
                  eventId?: string;
                  inProgress: boolean;
                  kind: "event";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                };
          }>;
          workflowId: string;
          workpoolOptions?: {
            defaultRetryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
            retryActionsByDefault?: boolean;
          };
        },
        Array<{
          _creationTime: number;
          _id: string;
          step:
            | {
                args: any;
                argsSize: number;
                completedAt?: number;
                functionType: "query" | "mutation" | "action";
                handle: string;
                inProgress: boolean;
                kind?: "function";
                name: string;
                runResult?:
                  | { kind: "success"; returnValue: any }
                  | { error: string; kind: "failed" }
                  | { kind: "canceled" };
                startedAt: number;
                workId?: string;
              }
            | {
                args: any;
                argsSize: number;
                completedAt?: number;
                handle: string;
                inProgress: boolean;
                kind: "workflow";
                name: string;
                runResult?:
                  | { kind: "success"; returnValue: any }
                  | { error: string; kind: "failed" }
                  | { kind: "canceled" };
                startedAt: number;
                workflowId?: string;
              }
            | {
                args: { eventId?: string };
                argsSize: number;
                completedAt?: number;
                eventId?: string;
                inProgress: boolean;
                kind: "event";
                name: string;
                runResult?:
                  | { kind: "success"; returnValue: any }
                  | { error: string; kind: "failed" }
                  | { kind: "canceled" };
                startedAt: number;
              };
          stepNumber: number;
          workflowId: string;
        }>
      >;
    };
    workflow: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { workflowId: string },
        null
      >;
      cleanup: FunctionReference<
        "mutation",
        "internal",
        { workflowId: string },
        boolean
      >;
      complete: FunctionReference<
        "mutation",
        "internal",
        {
          generationNumber: number;
          runResult:
            | { kind: "success"; returnValue: any }
            | { error: string; kind: "failed" }
            | { kind: "canceled" };
          workflowId: string;
        },
        null
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          maxParallelism?: number;
          onComplete?: { context?: any; fnHandle: string };
          startAsync?: boolean;
          workflowArgs: any;
          workflowHandle: string;
          workflowName: string;
        },
        string
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { workflowId: string },
        {
          inProgress: Array<{
            _creationTime: number;
            _id: string;
            step:
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  functionType: "query" | "mutation" | "action";
                  handle: string;
                  inProgress: boolean;
                  kind?: "function";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workId?: string;
                }
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  handle: string;
                  inProgress: boolean;
                  kind: "workflow";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workflowId?: string;
                }
              | {
                  args: { eventId?: string };
                  argsSize: number;
                  completedAt?: number;
                  eventId?: string;
                  inProgress: boolean;
                  kind: "event";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                };
            stepNumber: number;
            workflowId: string;
          }>;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          workflow: {
            _creationTime: number;
            _id: string;
            args: any;
            generationNumber: number;
            logLevel?: any;
            name?: string;
            onComplete?: { context?: any; fnHandle: string };
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt?: any;
            state?: any;
            workflowHandle: string;
          };
        }
      >;
      listSteps: FunctionReference<
        "query",
        "internal",
        {
          order: "asc" | "desc";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          workflowId: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            args: any;
            completedAt?: number;
            eventId?: string;
            kind: "function" | "workflow" | "event";
            name: string;
            nestedWorkflowId?: string;
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt: number;
            stepId: string;
            stepNumber: number;
            workId?: string;
            workflowId: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
    };
  };
};
