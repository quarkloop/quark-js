/**
 * {@link QuarkClientBuilder} — fluent builder for {@link QuarkClient}.
 *
 * Only the server endpoint URL is required. On `build()`, the SDK calls
 * `DiscoverServices` on the server's `ServiceDiscovery` service to
 * discover all other service URLs (auth, node, workflow) automatically.
 *
 * ```ts
 * const quark = await new QuarkClientBuilder()
 *   .serverEndpoint('http://127.0.0.1:3000')
 *   .accessToken('<jwt>')
 *   .requestTimeout(15_000)
 *   .build();
 *
 * const session = await quark.auth().login({ handle: 'reza', apiKey: '…' });
 * const result = await quark.node().execute({ nodeUri: '…', input: … });
 * const run = await quark.workflow().startRun({ workflowId: '…', input: … });
 * ```
 *
 * The builder is single-use: {@link build} consumes the accumulated state and
 * the builder instance should not be reused afterwards.
 */

import type { Interceptor } from '@connectrpc/connect';
import { createClient } from '@connectrpc/connect';
import { QuarkClient } from './client.ts';
import {
  createQuarkTransport,
  type QuarkProtocol,
  type QuarkTransport,
  type QuarkHeadersInit,
} from './transport.ts';
import { ServiceDiscovery } from './gen/server_pb.js';
import type { ServiceEntry } from './gen/server_pb.js';

/** Default per-RPC deadline (30 seconds) if none is configured. */
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Shared transport options derived from builder state.
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
 *
 * The only required configuration is the server endpoint URL. All other
 * service endpoints (auth, node, workflow) are discovered automatically
 * via the server's `ServiceDiscovery` service.
 */
export class QuarkClientBuilder {
  private serverEndpointUrl?: string;

  private connectTimeoutMs: number = 10_000;
  private requestTimeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS;

  private protocolValue: QuarkProtocol = 'connect';
  private defaultHeaders: Headers = new Headers();
  private readonly interceptors: Interceptor[] = [];
  private fetchFn?: typeof fetch;
  private accessTokenValue?: string;

  /**
   * Set the server endpoint URL. This is the ONLY endpoint the caller
   * needs to know — all other service URLs are discovered from the
   * server's `ServiceDiscovery` service.
   */
  serverEndpoint(url: string): this {
    this.serverEndpointUrl = normalizeUrl(url);
    return this;
  }

  /**
   * Set the connection timeout in milliseconds.
   */
  connectTimeout(ms: number): this {
    if (!Number.isFinite(ms) || ms <= 0) {
      throw new RangeError(`connectTimeout must be a positive finite number, got ${ms}`);
    }
    this.connectTimeoutMs = ms;
    return this;
  }

  /**
   * Set the default per-RPC deadline in milliseconds.
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
   * This is an async operation that:
   * 1. Connects to the server endpoint.
   * 2. Calls `DiscoverServices` to discover all healthy service URLs.
   * 3. Creates sub-clients for each discovered service.
   *
   * If a service is not registered in the discovery registry, its
   * sub-client will be `undefined` (accessing it throws an error).
   */
  async build(): Promise<QuarkClient> {
    const serverUrl = this.serverEndpointUrl;
    if (serverUrl === undefined) {
      throw new Error(
        'QuarkClientBuilder.build() requires serverEndpoint(url). ' +
        'All other service URLs are discovered automatically.',
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

    // 1. Create the server transport (always available — it's the bootstrap).
    const serverTransport = this.transportFor(serverUrl, shared);

    // 2. Discover all healthy services from the server.
    const services = await discoverServices(serverTransport);

    // 3. Find service URLs by name.
    const authUrl = findServiceUrl(services, 'auth');
    const nodeUrl = findServiceUrl(services, 'node');
    const workflowUrl = findServiceUrl(services, 'workflow');

    // 4. Create transports for each discovered service.
    const config = {
      serverTransport,
      authTransport: authUrl ? this.transportFor(authUrl, shared) : undefined,
      nodeTransport: nodeUrl ? this.transportFor(nodeUrl, shared) : undefined,
      workflowTransport: workflowUrl ? this.transportFor(workflowUrl, shared) : undefined,
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
 * Call `DiscoverServices` on the server and return the list of healthy
 * service entries.
 */
async function discoverServices(
  transport: QuarkTransport,
): Promise<ServiceEntry[]> {
  const client = createClient(ServiceDiscovery, transport.underlying);
  const response = await client.discoverServices({
    names: [],
    healthyOnly: true,
  });
  return response.services;
}

/** Find a service URL by name from the discovery results. */
function findServiceUrl(
  services: ServiceEntry[],
  name: string,
): string | undefined {
  return services.find((s) => s.name === name)?.grpcUrl;
}

/**
 * Normalise an endpoint URL: trim surrounding whitespace and strip any
 * trailing slashes.
 */
function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    throw new RangeError('endpoint URL must be a non-empty string');
  }
  return trimmed.replace(/\/+$/, '');
}
