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

// ─── Public API interfaces ──────────────────────────────────────────────

export interface NodeHandle<I = unknown, O = unknown> {
  run(input: I): Promise<O>;
  info(): Promise<NodeInfo>;
  validate(
    inputValidator?: (input: unknown) => void | Promise<void>,
    outputValidator?: (output: unknown) => void | Promise<void>,
  ): NodeHandle<I, O>;
}

export interface PipelineBuilder {
  then(uri: string, partialInput?: Record<string, unknown>): PipelineBuilder;
  execute(): Promise<unknown>;
}

export interface QuarkClient<S extends QuarkSchema = DefaultSchema> {
  node(uri: string): NodeHandle;
  run(uri: string, input: unknown): Promise<unknown>;
  batch(calls: Array<[string, unknown]>): Promise<unknown[]>;
  pipeline(uri: string, input: unknown): PipelineBuilder;
  list(prefix?: string): Promise<NodeInfo[]>;
  search(keyword: string): Promise<NodeInfo[]>;
  pull(uri: string): Promise<NodePackage>;
  close(): Promise<void>;
}

export interface QuarkAdminClient {
  push(uri: string, pkg: PushNodeRequest): Promise<void>;
  delete(uri: string): Promise<void>;
  list(prefix?: string): Promise<NodeInfo[]>;
  search(keyword: string): Promise<NodeInfo[]>;
  info(uri: string): Promise<NodeInfo>;
  pull(uri: string): Promise<NodePackage>;
  health(): Promise<HealthStatus>;
  status(): Promise<RuntimeStatus>;
  flushCache(uri?: string): Promise<void>;
  close(): Promise<void>;
}
