/**
 * {@link QuarkClient} — the unified facade over all Quark gRPC services.
 *
 * Each accessor returns the corresponding service client directly. For auth,
 * {@link AuthClient} extends {@link AuthService} so `quark.auth().login(...)`
 * works without a double call.
 *
 * Construct a `QuarkClient` with {@link QuarkClientBuilder.build} — never
 * instantiate it directly.
 */

import { AuthClient } from './services/auth.ts';
import { ServerService } from './services/server.ts';
import { NodeService } from './services/node.ts';
import { WorkflowService } from './services/workflow.ts';
import type { QuarkTransport } from './transport.ts';

/**
 * Constructor argument for {@link QuarkClient}. Produced by
 * {@link QuarkClientBuilder.build}; not intended to be hand-constructed.
 */
export interface QuarkClientConfig {
  authTransport?: QuarkTransport;
  serverTransport?: QuarkTransport;
  nodeTransport?: QuarkTransport;
  workflowTransport?: QuarkTransport;
  workflowNamespace?: string;
  workflowIdentity?: string;
}

/**
 * Unified client for the Quark platform.
 */
export class QuarkClient {
  private _auth?: AuthClient;
  private _server?: ServerService;
  private _node?: NodeService;
  private _workflow?: WorkflowService;

  private readonly _authTransport?: QuarkTransport;
  private readonly _serverTransport?: QuarkTransport;
  private readonly _nodeTransport?: QuarkTransport;
  private readonly _workflowTransport?: QuarkTransport;
  private readonly _workflowNamespace?: string;
  private readonly _workflowIdentity?: string;

  /** @internal Use {@link QuarkClientBuilder.build}. */
  constructor(config: QuarkClientConfig) {
    this._authTransport = config.authTransport;
    this._serverTransport = config.serverTransport;
    this._nodeTransport = config.nodeTransport;
    this._workflowTransport = config.workflowTransport;
    this._workflowNamespace = config.workflowNamespace;
    this._workflowIdentity = config.workflowIdentity;
  }

  /** `true` if an auth endpoint was configured on the builder. */
  hasAuth(): boolean { return this._authTransport !== undefined; }

  /**
   * The auth client. Extends `AuthService` so `login`, `signup`, `token`,
   * `verify`, etc. are callable directly. Other auth services (users, mfa,
   * admin, etc.) are accessed via accessors on the returned object.
   */
  auth(): AuthClient {
    if (!this._authTransport) {
      throw new Error(
        'QuarkClient.auth() called but no auth endpoint was configured. ' +
        'Call QuarkClientBuilder.authEndpoint(url) before build().',
      );
    }
    return this._auth ??= new AuthClient(this._authTransport);
  }

  /** `true` if a server endpoint was configured. */
  hasServer(): boolean { return this._serverTransport !== undefined; }

  /** `platform.server.v1.ServerService` — orchestration, registry, admin (8 RPCs). */
  server(): ServerService {
    if (!this._serverTransport) {
      throw new Error(
        'QuarkClient.server() called but no server endpoint was configured. ' +
        'Call QuarkClientBuilder.serverEndpoint(url) before build().',
      );
    }
    return this._server ??= new ServerService(this._serverTransport, 'platform.server.v1.ServerService');
  }

  /** `true` if a node endpoint was configured. */
  hasNode(): boolean { return this._nodeTransport !== undefined; }

  /** `quark.node.v1.NodeService` — node execution daemon API (7 RPCs). */
  node(): NodeService {
    if (!this._nodeTransport) {
      throw new Error(
        'QuarkClient.node() called but no node endpoint was configured. ' +
        'Call QuarkClientBuilder.nodeEndpoint(url) before build().',
      );
    }
    return this._node ??= new NodeService(this._nodeTransport, 'quark.node.v1.NodeService');
  }

  /** `true` if a workflow endpoint was configured. */
  hasWorkflow(): boolean { return this._workflowTransport !== undefined; }

  /** `platform.workflow.v1.WorkflowService` — workflow metadata + run lifecycle (9 RPCs). */
  workflow(): WorkflowService {
    if (!this._workflowTransport) {
      throw new Error(
        'QuarkClient.workflow() called but no workflow endpoint was configured. ' +
        'Call QuarkClientBuilder.workflowEndpoint(url) before build().',
      );
    }
    return this._workflow ??= new WorkflowService(
      this._workflowTransport,
      'platform.workflow.v1.WorkflowService',
      this._workflowNamespace,
      this._workflowIdentity,
    );
  }

  /**
   * Close every configured transport, releasing resources.
   */
  async close(onError?: (err: unknown) => void): Promise<void> {
    const closers: Array<Promise<void>> = [];
    if (this._authTransport) closers.push(this._authTransport.close().catch((e) => onError?.(e)));
    if (this._serverTransport) closers.push(this._serverTransport.close().catch((e) => onError?.(e)));
    if (this._nodeTransport) closers.push(this._nodeTransport.close().catch((e) => onError?.(e)));
    if (this._workflowTransport) closers.push(this._workflowTransport.close().catch((e) => onError?.(e)));
    await Promise.all(closers);
  }
}
