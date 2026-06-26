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

// ─── Wire protocol ──────────────────────────────────────────────────────

export interface ExecuteResponse {
  success: boolean;
  output?: unknown;
  error?: string;
}

export interface NodeInfo {
  uri: string;
  version: string;
  description: string;
  language: string;
  contentType?: string;
  checksum?: string;
  createdAt?: string;
}

export interface CatalogListResponse {
  nodes: NodeInfo[];
}

export interface HealthStatus {
  status: string;
  version: string;
}

export interface RuntimeStatus {
  runtimeId: string;
  mode: string;
  loadedNodes: string[];
  uptime: number;
}

export interface NodePackage {
  uri: string;
  version: string;
  manifest: string;
  content: Uint8Array;
  contentType: string;
  checksum: string;
  createdAt: string;
}

export interface PushNodeRequest {
  uri: string;
  version: string;
  manifest: string;
  content: Uint8Array;
  contentType: string;
}
