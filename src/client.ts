/**
 * {@link QuarkClient} — the unified facade over all Quark gRPC services.
 *
 * A single `QuarkClient` instance holds zero or more of the sub-clients
 * (`AuthClient`, `ServerClient`, `NodeClient`, `WorkflowClient`), each bound
 * to its own endpoint. Sub-clients that were not configured on the builder
 * are `undefined`, and the corresponding accessor throws so that misuse fails
 * loudly and early instead of producing a confusing `TypeError` deeper in the
 * call stack.
 *
 * Construct a `QuarkClient` with {@link QuarkClientBuilder.build} — never
 * instantiate it directly.
 */

import type { AuthClient } from './services/auth.ts';
import type { ServerClient } from './services/server.ts';
import type { NodeClient } from './services/node.ts';
import type { WorkflowClient } from './services/workflow.ts';

/**
 * Constructor argument for {@link QuarkClient}. Produced by
 * {@link QuarkClientBuilder.build}; not intended to be hand-constructed.
 */
export interface QuarkClientConfig {
  auth?: AuthClient;
  server?: ServerClient;
  node?: NodeClient;
  workflow?: WorkflowClient;
}

/**
 * Unified client for the Quark platform.
 *
 * Each accessor returns the corresponding sub-client configured on the
 * builder, or throws if it was not. Use {@link hasAuth}, {@link hasServer},
 * {@link hasNode}, {@link hasWorkflow} to check availability without throwing.
 */
export class QuarkClient {
  private readonly _auth?: AuthClient;
  private readonly _server?: ServerClient;
  private readonly _node?: NodeClient;
  private readonly _workflow?: WorkflowClient;

  /** @internal Use {@link QuarkClientBuilder.build}. */
  constructor(config: QuarkClientConfig) {
    this._auth = config.auth;
    this._server = config.server;
    this._node = config.node;
    this._workflow = config.workflow;
  }

  /** `true` if an auth endpoint was configured on the builder. */
  hasAuth(): this is { auth(): AuthClient } {
    return this._auth !== undefined;
  }

  /** `true` if a server (control-plane) endpoint was configured. */
  hasServer(): this is { server(): ServerClient } {
    return this._server !== undefined;
  }

  /** `true` if a node endpoint was configured. */
  hasNode(): this is { node(): NodeClient } {
    return this._node !== undefined;
  }

  /** `true` if a workflow endpoint was configured. */
  hasWorkflow(): this is { workflow(): WorkflowClient } {
    return this._workflow !== undefined;
  }

  /**
   * The auth sub-client. Throws if no auth endpoint was configured — use
   * {@link hasAuth} to guard.
   */
  auth(): AuthClient {
    if (!this._auth) {
      throw new Error(
        'QuarkClient.auth() called but no auth endpoint was configured. ' +
          'Call QuarkClientBuilder.authEndpoint(url) before build().',
      );
    }
    return this._auth;
  }

  /**
   * The server (control-plane) sub-client. Throws if no server endpoint was
   * configured — use {@link hasServer} to guard.
   */
  server(): ServerClient {
    if (!this._server) {
      throw new Error(
        'QuarkClient.server() called but no server endpoint was configured. ' +
          'Call QuarkClientBuilder.serverEndpoint(url) before build().',
      );
    }
    return this._server;
  }

  /**
   * The node sub-client. Throws if no node endpoint was configured — use
   * {@link hasNode} to guard.
   */
  node(): NodeClient {
    if (!this._node) {
      throw new Error(
        'QuarkClient.node() called but no node endpoint was configured. ' +
          'Call QuarkClientBuilder.nodeEndpoint(url) before build().',
      );
    }
    return this._node;
  }

  /**
   * The workflow sub-client. Throws if no workflow endpoint was configured —
   * use {@link hasWorkflow} to guard.
   */
  workflow(): WorkflowClient {
    if (!this._workflow) {
      throw new Error(
        'QuarkClient.workflow() called but no workflow endpoint was ' +
          'configured. Call QuarkClientBuilder.workflowEndpoint(url) ' +
          'before build().',
      );
    }
    return this._workflow;
  }

  /**
   * Close every configured sub-client, releasing transport resources.
   * Never throws — close errors are swallowed and reported via the optional
   * `onError` callback so that one failing close doesn't mask others.
   */
  async close(onError?: (err: unknown) => void): Promise<void> {
    const closers: Array<Promise<void>> = [];
    if (this._auth) {
      closers.push(this._auth.close().catch((e) => onError?.(e)));
    }
    if (this._server) {
      closers.push(this._server.close().catch((e) => onError?.(e)));
    }
    if (this._node) {
      closers.push(this._node.close().catch((e) => onError?.(e)));
    }
    if (this._workflow) {
      closers.push(this._workflow.close().catch((e) => onError?.(e)));
    }
    await Promise.all(closers);
  }
}
