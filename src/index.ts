/**
 * index.ts — Public API exports for @quarkloop/quark-js.
 *
 * Single responsibility: re-export public types and factory functions.
 */

// Factories
export { createClient } from "./client-factory.ts";
export { createAdminClient } from "./admin-factory.ts";

// Errors
export { QuarkError, NodeExecutionError, ValidationError, CatalogError, ConnectionError, NotImplementedError } from "./errors.ts";

// Types
export type {
  QuarkClient,
  QuarkAdminClient,
  QuarkClientOptions,
  QuarkSchema,
  NodeEntry,
  DefaultSchema,
  NodeHandle,
  NodeInfo,
  NodePackage,
  PushNodeRequest,
  HealthStatus,
  RuntimeStatus,
  PipelineBuilder,
  CatalogListResponse,
  ExecuteResponse,
} from "./types.ts";
