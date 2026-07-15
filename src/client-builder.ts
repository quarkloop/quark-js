/**
 * {@link QuarkClientBuilder} — fluent builder for {@link QuarkClient}.
 *
 * A single builder accumulates endpoint URLs and shared configuration for any
 * subset of the four Quark components (auth, server, node, workflow), then
 * {@link QuarkClientBuilder.build | build()} produces a {@link QuarkClient}
 * whose accessors expose the configured service clients directly.
 *
 * ```ts
 * const quark = await new QuarkClientBuilder()
 *   .authEndpoint('https://auth.example.com')
 *   .serverEndpoint('https://127.0.0.1:3000')
 *   .nodeEndpoint('https://node.example.com')
 *   .workflowEndpoint('https://workflow.example.com')
 *   .accessToken('<jwt>')
 *   .requestTimeout(15_000)
 *   .build();
 *
 * const session = await quark.auth().login({ handle: 'reza', apiKey: '…' });
 * const registry = await quark.server().getServiceRegistry({});
 * const result = await quark.node().execute({ nodeUri: '…', input: … });
 * const run = await quark.workflow().startRun({ workflowId: '…', input: … });
 * ```
 *
 * The builder is single-use: {@link build} consumes the accumulated state and
 * the builder instance should not be reused afterwards.
 */

import type { Interceptor } from '@connectrpc/connect';
import { QuarkClient } from './client.ts';
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

  /** Set the server (orchestration) endpoint URL. */
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
   * Set the connection timeout in milliseconds.
   *
   * The fetch-based Connect transports used today hold no persistent
   * connection, so this value is currently informational — it bounds any
   * future pre-flight reachability check. Per-RPC deadlines are controlled
   * by {@link requestTimeout}.
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
   * value. Defaults to 30 000 ms. Set to `0` to disable the default deadline.
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
   * - `connect` (default) — Connect-JSON over HTTP. Human-readable payloads.
   * - `grpc-web` — gRPC-Web. Binary protobuf framing; use when the upstream
   *   service is exposed via a gRPC-Web gateway.
   */
  protocol(protocol: QuarkProtocol): this {
    this.protocolValue = protocol;
    return this;
  }

  /**
   * Set the default `Authorization: Bearer <token>` header applied to every
   * RPC across every configured endpoint.
   */
  accessToken(token: string): this {
    this.accessTokenValue = token;
    this.defaultHeaders.set('Authorization', `Bearer ${token}`);
    return this;
  }

  /** Add a default header applied to every RPC. */
  header(name: string, value: string): this {
    this.defaultHeaders.set(name, value);
    return this;
  }

  /** Replace the default headers wholesale. */
  headers(headers: QuarkHeadersInit): this {
    this.defaultHeaders = new Headers(headers);
    return this;
  }

  /** Append a Connect-RPC interceptor to every underlying transport. */
  interceptor(interceptor: Interceptor): this {
    this.interceptors.push(interceptor);
    return this;
  }

  /** Provide a custom `fetch` implementation. */
  fetch(fetchFn: typeof fetch): this {
    this.fetchFn = fetchFn;
    return this;
  }

  /**
   * Build the {@link QuarkClient} from the accumulated configuration.
   *
   * Creates one {@link QuarkTransport} per configured endpoint. Throws if no
   * endpoints are configured. The returned promise resolves immediately —
   * the Connect transports perform no network I/O at construction time.
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
    void this.connectTimeoutMs;
    void this.accessTokenValue;

    const config = {
      authTransport: this.authEndpointUrl ? this.transportFor(this.authEndpointUrl, shared) : undefined,
      serverTransport: this.serverEndpointUrl ? this.transportFor(this.serverEndpointUrl, shared) : undefined,
      nodeTransport: this.nodeEndpointUrl ? this.transportFor(this.nodeEndpointUrl, shared) : undefined,
      workflowTransport: this.workflowEndpointUrl ? this.transportFor(this.workflowEndpointUrl, shared) : undefined,
    };

    return new QuarkClient(config);
  }

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
