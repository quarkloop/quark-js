/**
 * types.ts — Type definitions for the Quark client API.
 *
 * Single responsibility: define the contracts. No implementation.
 */

// ─── Client options ─────────────────────────────────────────────────────

export interface QuarkClientOptions {
  servers: string[];
  timeout?: number;
  requestTimeout?: number;
}

// ─── Schema (for type-safe node calls) ──────────────────────────────────

export interface NodeEntry {
  input: unknown;
  output: unknown;
  stream?: boolean;
}

export type QuarkSchema = Record<string, NodeEntry>;

export interface DefaultSchema extends QuarkSchema {
  [uri: string]: NodeEntry;
}
