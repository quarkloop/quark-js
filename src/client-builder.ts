/**
 * {@link QuarkClientBuilder} — fluent builder for {@link QuarkClient}.
 *
 * A single builder accumulates endpoint URLs and shared configuration for any
 * subset of the four Quarkloop components (auth, server, node, workflow), then
 * {@link QuarkClientBuilder.build | build()} produces a {@link QuarkClient}
 * whose accessors expose only the configured sub-clients.
 *
 * ```ts
 * const quark = await new QuarkClientBuilder()
 *   .authEndpoint('https://auth.example.com')
 *   .serverEndpoint('https://controlplane.example.com')
 *   .nodeEndpoint('https://node.example.com')
 *   .workflowEndpoint('https://workflow.example.com')
 *   .workflowNamespace('my-org/my-project')
 *   .workflowIdentity('user-123')
 *   .accessToken('<jwt>')
 *   .requestTimeout(15_000)
 *   .build();
 *
 * const session = await quark.auth().auth().login({ handle: 'reza', apiKey: '…' });
 * const registry = await quark.server().controlPlane().getServiceRegistry({});
 * const result = await quark.node().node().execute({ nodeUri: '…', input: { … } });
 * const run = await quark.workflow().workflow().startRun({ workflowId: '…' });
 * ```
 *
 * The builder is single-use: {@link build} consumes the accumulated state and
 * the builder instance should not be reused afterwards.
 */

import type { Interceptor } from '@connectrpc/connect';
import { QuarkClient, type QuarkClientConfig } from './client.ts';
import { AuthClient } from './services/auth.ts';
import { ServerClient } from './services/server.ts';
import { NodeClient } from './services/node.ts';
import { WorkflowClient } from './services/workflow.ts';
import {
  createQuarkTransport,
  type QuarkProtocol,
  type QuarkTransport,
  type QuarkHeadersInit,
} from './transport.ts';

/** Default per-RPC deadline (30 seconds) if none is configured. */
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Shared transport options derived from builder state.
 *
 * Each configured endpoint produces one {@link QuarkTransport} from these
 * shared options plus the endpoint-specific `baseUrl`.
 */
interface SharedTransportOptions {
  protocol: QuarkProtocol;
  defaultTimeoutMs: number;
  defaultHeaders: Headers;
  interceptors: Interceptor[];
  fetch?: typeof fetch;
}

/**
 * Fluent builder for {@link QuarkClient}.
 */
export class QuarkClientBuilder {
  private authEndpointUrl?: string;
  private serverEndpointUrl?: string;
  private nodeEndpointUrl?: string;
  private workflowEndpointUrl?: string;

  private workflowNamespaceValue?: string;
  private workflowIdentityValue?: string;

  private connectTimeoutMs: number = 10_000;
  private requestTimeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS;

  private protocolValue: QuarkProtocol = 'connect';
  private defaultHeaders: Headers = new Headers();
  private readonly interceptors: Interceptor[] = [];
  private fetchFn?: typeof fetch;
  private accessTokenValue?: string;

  /** Set the auth-service endpoint URL (no trailing slash required). */
  authEndpoint(url: string): this {
    this.authEndpointUrl = normalizeUrl(url);
    return this;
  }

  /** Set the server (control-plane) endpoint URL. */
  serverEndpoint(url: string): this {
    this.serverEndpointUrl = normalizeUrl(url);
    return this;
  }

  /** Set the node-execution daemon endpoint URL. */
  nodeEndpoint(url: string): this {
    this.nodeEndpointUrl = normalizeUrl(url);
    return this;
  }

  /** Set the workflow-service endpoint URL. */
  workflowEndpoint(url: string): this {
    this.workflowEndpointUrl = normalizeUrl(url);
    return this;
  }

  /**
   * Set the default workflow namespace. When set, every workflow RPC request
   * that does not already include a `namespace` field is shallow-merged with
   * this value.
   */
  workflowNamespace(ns: string): this {
    this.workflowNamespaceValue = ns;
    return this;
  }

  /**
   * Set the default workflow caller identity. When set, every workflow RPC
   * request that does not already include an `identity` field is shallow-
   * merged with this value.
   */
  workflowIdentity(id: string): this {
    this.workflowIdentityValue = id;
    return this;
  }

  /**
   * Set the connection timeout in milliseconds.
   *
   * The fetch-based transports used today hold no persistent connection, so
   * this value is currently informational — it bounds any future pre-flight
   * reachability check. Per-RPC deadlines are controlled by
   * {@link requestTimeout}.
   */
  connectTimeout(ms: number): this {
    if (!Number.isFinite(ms) || ms <= 0) {
      throw new RangeError(`connectTimeout must be a positive finite number, got ${ms}`);
    }
    this.connectTimeoutMs = ms;
    return this;
  }

  /**
   * Set the default per-RPC deadline in milliseconds. Every unary call that
   * does not override `timeoutMs` in its `CallOptions` is bounded by this
   * value. Defaults to 30 000 ms. Set to `0` to disable the default deadline
   * (calls will run until the server or network responds).
   */
  requestTimeout(ms: number): this {
    if (!Number.isFinite(ms) || ms < 0) {
      throw new RangeError(`requestTimeout must be a non-negative finite number, got ${ms}`);
    }
    this.requestTimeoutMs = ms;
    return this;
  }

  /**
   * Select the wire protocol for the underlying Connect transport.
   *
   * - `connect` (default) — Connect-JSON over HTTP. Used by the raw call path
   *   today; works against any Connect-protocol endpoint.
   * - `grpc-web` — gRPC-Web. Requires protobuf codegen for binary framing;
   *   the raw call path still uses Connect-JSON until codegen lands.
   */
  protocol(protocol: QuarkProtocol): this {
    this.protocolValue = protocol;
    return this;
  }

  /**
   * Set the default `Authorization: Bearer <token>` header applied to every
   * RPC across every configured endpoint. Individual calls can override or
   * augment headers via `CallOptions.headers`.
   */
  accessToken(token: string): this {
    this.accessTokenValue = token;
    this.defaultHeaders.set('Authorization', `Bearer ${token}`);
    return this;
  }

  /**
   * Add a default header applied to every RPC. Headers set here are merged
   * into every request ahead of per-call headers.
   */
  header(name: string, value: string): this {
    this.defaultHeaders.set(name, value);
    return this;
  }

  /**
   * Replace the default headers wholesale. The previous headers (including
   * any set via {@link accessToken}) are discarded.
   */
  headers(headers: QuarkHeadersInit): this {
    // Replace the whole map by constructing a fresh `Headers` — the undici /
    // DOM `Headers` class has no `clear()` method.
    this.defaultHeaders = new Headers(headers);
    return this;
  }

  /**
   * Append a Connect-RPC interceptor to every underlying transport. The
   * interceptors are applied to the underlying `@connectrpc/connect`
   * transport; they will take effect for typed `createClient` calls once
   * proto codegen is wired up.
   */
  interceptor(interceptor: Interceptor): this {
    this.interceptors.push(interceptor);
    return this;
  }

  /**
   * Provide a custom `fetch` implementation. Required in environments without
   * a global `fetch` (e.g. older Node.js); optional elsewhere.
   */
  fetch(fetchFn: typeof fetch): this {
    this.fetchFn = fetchFn;
    return this;
  }

  /**
   * Build the {@link QuarkClient} from the accumulated configuration.
   *
   * Creates one {@link QuarkTransport} per configured endpoint and wires up
   * the corresponding sub-client(s). Throws if no endpoints are configured.
   * The returned promise resolves immediately — the fetch-based transports
   * perform no network I/O at construction time, so the first RPC is the
   * first network round-trip.
   */
  async build(): Promise<QuarkClient> {
    if (
      this.authEndpointUrl === undefined &&
      this.serverEndpointUrl === undefined &&
      this.nodeEndpointUrl === undefined &&
      this.workflowEndpointUrl === undefined
    ) {
      throw new Error(
        'QuarkClientBuilder.build() called with no endpoints configured. ' +
          'Call at least one of authEndpoint/serverEndpoint/nodeEndpoint/' +
          'workflowEndpoint before build().',
      );
    }

    const shared: SharedTransportOptions = {
      protocol: this.protocolValue,
      defaultTimeoutMs: this.requestTimeoutMs,
      defaultHeaders: this.defaultHeaders,
      interceptors: this.interceptors,
      fetch: this.fetchFn,
    };
    // connectTimeoutMs is currently informational; surface it so future
    // pre-flight checks can read it without re-plumbing the builder.
    void this.connectTimeoutMs;

    const config: QuarkClientConfig = {};

    if (this.authEndpointUrl) {
      config.auth = new AuthClient(this.transportFor(this.authEndpointUrl, shared));
    }
    if (this.serverEndpointUrl) {
      config.server = new ServerClient(this.transportFor(this.serverEndpointUrl, shared));
    }
    if (this.nodeEndpointUrl) {
      config.node = new NodeClient(this.transportFor(this.nodeEndpointUrl, shared));
    }
    if (this.workflowEndpointUrl) {
      config.workflow = new WorkflowClient(
        this.transportFor(this.workflowEndpointUrl, shared),
        this.workflowNamespaceValue,
        this.workflowIdentityValue,
      );
    }

    return new QuarkClient(config);
  }

  /**
   * Construct a single {@link QuarkTransport} bound to `baseUrl` with the
   * shared options.
   */
  private transportFor(baseUrl: string, shared: SharedTransportOptions): QuarkTransport {
    return createQuarkTransport({
      baseUrl,
      protocol: shared.protocol,
      defaultTimeoutMs: shared.defaultTimeoutMs,
      defaultHeaders: shared.defaultHeaders,
      interceptors: shared.interceptors,
      fetch: shared.fetch,
    });
  }
}

/**
 * Normalise an endpoint URL: trim surrounding whitespace and strip any
 * trailing slashes so that `{baseUrl}/{service}/{method}` joins cleanly.
 */
function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    throw new RangeError('endpoint URL must be a non-empty string');
  }
  return trimmed.replace(/\/+$/, '');
}
