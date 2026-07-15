/**
 * Node service client.
 *
 * Wraps the `quark.node.v1.NodeService` gRPC service — the API exposed by the
 * node execution daemon. The daemon listens on `--grpc-addr` (default
 * `0.0.0.0:50051`) and serves the 7 RPCs below.
 *
 * | RPC       | Purpose                                                       |
 * |-----------|---------------------------------------------------------------|
 * | Execute   | Execute a node by URI with an input `Value` and a deadline    |
 * | Cancel    | Cancel an in-flight execution by `request_id`                 |
 * | Health    | Liveness probe — is the daemon process alive?                 |
 * | Ready     | Readiness probe — is the daemon accepting requests?           |
 * | Status    | Detailed runtime status (host, version, catalog, execution)   |
 * | Drain     | Stop accepting new requests; finish in-flight; then return    |
 * | Shutdown  | Stop the daemon (optionally forceful)                         |
 *
 * Request and response messages are typed `unknown` until `buf generate` is
 * wired up; see the package-level README for the codegen roadmap.
 */

import type { QuarkCallOptions, QuarkTransport } from '../transport.ts';
import { ServiceClient } from '../transport.ts';

/**
 * `quark.node.v1.NodeService` — node execution daemon API (7 RPCs).
 */
export class NodeService extends ServiceClient {
  /**
   * Execute a node by URI. The request carries an `api_version`,
   * `request_id`, `node_uri`, an input `Value`, a `deadline_ms`, an optional
   * `mode`, and `RequestMetadata` (trace/span/caller). Returns the execution
   * output or an `ApiError`.
   */
  execute(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Execute', request, options);
  }

  /**
   * Cancel an in-flight execution by `request_id`. Returns whether the
   * cancellation was acknowledged.
   */
  cancel(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Cancel', request, options);
  }

  /** Liveness probe. Returns a `status`, `uptime_ms`, and any `ApiError`. */
  health(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Health', request, options);
  }

  /** Readiness probe. Returns `status`, `ready`, and a `reason` if not ready. */
  ready(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Ready', request, options);
  }

  /**
   * Detailed runtime status: host ID, runtime version, uptime, catalog
   * status (node count, last sync), and execution status (concurrency, queue,
   * totals).
   */
  status(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Status', request, options);
  }

  /**
   * Stop accepting new requests, wait for in-flight executions to finish
   * (bounded by `timeout_ms`), then return the number drained.
   */
  drain(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Drain', request, options);
  }

  /** Shut the daemon down. `force` skips the drain step. */
  shutdown(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Shutdown', request, options);
  }
}

/**
 * Client for the Quarkloop node-execution daemon.
 *
 * Holds one {@link QuarkTransport} bound to the daemon's gRPC endpoint and
 * exposes the {@link NodeService}.
 */
export class NodeClient {
  private readonly transport: QuarkTransport;
  private _node?: NodeService;

  /** @internal Constructed by {@link QuarkClientBuilder.build}. */
  constructor(transport: QuarkTransport) {
    this.transport = transport;
  }

  /** The underlying transport (for advanced use). */
  get quarkTransport(): QuarkTransport {
    return this.transport;
  }

  /** `quark.node.v1.NodeService` (7 RPCs). */
  node(): NodeService {
    return (this._node ??= new NodeService(this.transport, 'quark.node.v1.NodeService'));
  }

  /** Release transport resources. */
  async close(): Promise<void> {
    await this.transport.close();
  }
}
