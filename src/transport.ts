/**
 * Internal transport layer.
 *
 * Until `buf generate` is wired up for this package we cannot produce typed
 * Connect-RPC service descriptors, which means we cannot use
 * `createClient(service, transport)` with real generated service descriptors.
 * To keep the SDK usable in the meantime, {@link QuarkTransport} performs raw
 * Connect-protocol unary calls over `fetch` using the JSON envelope.
 *
 * The Connect protocol (https://connectrpc.com/docs/protocol/) is a gRPC
 * dialect that runs over HTTP/1.1+ and supports JSON encoding natively. A
 * unary call is simply:
 *
 *   POST {baseUrl}/{package.Service}/{Method} HTTP/1.1
 *   Content-Type: application/json
 *   Connect-Protocol-Version: 1
 *
 *   <JSON-encoded request message>
 *
 * On success the response body is the JSON-encoded response message. On
 * failure the response body is a JSON object of the shape
 * `{ "code": "not_found", "message": "...", "details": [...] }` and the HTTP
 * status is non-2xx.
 *
 * The same transport object also instantiates the underlying
 * `@connectrpc/connect-web` transport (Connect or gRPC-Web). That underlying
 * transport is currently unused by the raw call path but is exposed so that,
 * once proto codegen lands, each sub-client can call
 * `createClient(serviceDesc, transport.underlying)` without re-wiring
 * configuration.
 */

import { Code, ConnectError, type Interceptor, type Transport } from '@connectrpc/connect';
import {
  createConnectTransport,
  createGrpcWebTransport,
} from '@connectrpc/connect-web';
import {
  ConnectionError,
  DeadlineExceededError,
  codeFromHttpStatus,
  codeFromWireName,
  fromConnectError,
} from './errors.ts';

/**
 * Wire protocol used by the underlying Connect transport.
 *
 * - `connect`  — Connect-JSON over HTTP. Used for the raw call path today.
 * - `grpc-web` — gRPC-Web. Requires protobuf codegen for binary framing; the
 *   raw call path falls back to Connect-JSON even when this is selected, and
 *   the underlying gRPC-Web transport is held for future `createClient` use.
 */
export type QuarkProtocol = 'connect' | 'grpc-web';

/**
 * Options used to construct a {@link QuarkTransport}.
 */
export interface QuarkTransportOptions {
  /** Base URL of the service (e.g. `https://auth.example.com`). No trailing slash. */
  baseUrl: string;
  /** Wire protocol for the underlying transport. Defaults to `connect`. */
  protocol?: QuarkProtocol;
  /** Default per-RPC deadline in milliseconds. */
  defaultTimeoutMs?: number;
  /** Default headers merged into every request. */
  defaultHeaders?: QuarkHeadersInit;
  /** Connect-RPC interceptors applied to the underlying transport. */
  interceptors?: Interceptor[];
  /** Optional `fetch` override (useful in Node without a global `fetch`). */
  fetch?: typeof fetch;
}

/**
 * Per-call options accepted by every RPC method.
 */
export interface QuarkCallOptions {
  /** Per-call deadline in milliseconds. Overrides the transport default. */
  timeoutMs?: number;
  /** Extra headers for this call only (merged over the transport defaults). */
  headers?: QuarkHeadersInit;
  /** Caller-supplied abort signal. Aborting cancels the request. */
  signal?: AbortSignal;
}

/**
 * Acceptable shapes for a headers initializer. Mirrors the standard
 * `HeadersInit` from the DOM lib / undici, but defined locally because this
 * package compiles with `lib: ["ES2022"]` (no DOM), where `HeadersInit` is
 * not declared as a top-level global (though it is the parameter type of the
 * global `Headers` constructor). `Headers` itself IS a global via
 * `@types/node`'s undici-backed web globals.
 */
export type QuarkHeadersInit =
  | Record<string, string>
  | string[][]
  | Headers;

/**
 * Base class for every gRPC service wrapper in this package.
 *
 * Holds the {@link QuarkTransport} (bound to a single endpoint) and the
 * fully-qualified proto service name. Subclasses expose one method per RPC;
 * each method delegates to {@link ServiceClient.rpc}.
 */
export abstract class ServiceClient {
  constructor(
    protected readonly transport: QuarkTransport,
    /** Fully-qualified proto service name, e.g. `platform.auth.v1.AuthService`. */
    protected readonly serviceName: string,
  ) {}

  /**
   * Invoke a unary RPC on this service.
   *
   * @param method PascalCase RPC name as declared in the `.proto` file
   *   (e.g. `Login`, `AdminListUsers`).
   * @param request JSON-serialisable request message.
   * @param options Per-call options (timeout, headers, abort signal).
   */
  protected rpc(
    method: string,
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.transport.unary(this.serviceName, method, request, options);
  }
}

/**
 * A transport bound to a single service endpoint.
 *
 * Each Quark service (auth, server, node, workflow) gets its own
 * {@link QuarkTransport} instance because they may live on different hosts
 * and ports.
 */
export interface QuarkTransport {
  /** The base URL all requests are rooted at. */
  readonly baseUrl: string;
  /** The wire protocol selected at construction time. */
  readonly protocol: QuarkProtocol;
  /** The default per-RPC deadline, if any. */
  readonly defaultTimeoutMs?: number;
  /**
   * The underlying `@connectrpc/connect` transport. Currently held for the
   * benefit of future proto-codegen-based typed clients; the raw call path
   * does not use it.
   */
  readonly underlying: Transport;
  /**
   * Perform a unary Connect-JSON RPC.
   *
   * @param service Fully-qualified proto service name, e.g.
   *   `platform.auth.v1.AuthService`.
   * @param method Proto RPC name as declared in the `.proto` file, e.g.
   *   `Login` (PascalCase — NOT the camelCase TS method name).
   * @param input Request message. Because proto codegen is not yet wired up,
   *   the type is `unknown`; at runtime this is `JSON.stringify`-ed as the
   *   request body.
   * @param options Per-call options.
   * @returns The decoded response message (parsed from the JSON response
   *   body). Typed as `unknown` until codegen lands.
   */
  unary(
    service: string,
    method: string,
    input: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown>;
  /**
   * Release any resources held by this transport. The fetch-based raw call
   * path holds no persistent resources, so this is effectively a no-op today;
   * it exists for API symmetry with future transports (e.g. gRPC over HTTP/2
   * via `@connectrpc/connect-node`) that do hold a connection pool.
   */
  close(): Promise<void>;
}

/**
 * Build a {@link QuarkTransport} bound to a single endpoint.
 */
export function createQuarkTransport(options: QuarkTransportOptions): QuarkTransport {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const protocol: QuarkProtocol = options.protocol ?? 'connect';
  const defaultTimeoutMs = options.defaultTimeoutMs;
  const defaultHeaders = new Headers(options.defaultHeaders);
  const fetchFn = options.fetch ?? globalThis.fetch;

  if (typeof fetchFn !== 'function') {
    throw new ConnectionError(
      'No global fetch is available. Provide a `fetch` option to the transport.',
    );
  }

  // The underlying Connect transport is configured now so that, when codegen
  // lands, switching each service from the raw call path to
  // `createClient(serviceDesc, transport.underlying)` requires no plumbing
  // changes.
  const underlying: Transport =
    protocol === 'grpc-web'
      ? createGrpcWebTransport({
          baseUrl,
          useBinaryFormat: false,
          interceptors: options.interceptors,
          defaultTimeoutMs,
          fetch: fetchFn,
        })
      : createConnectTransport({
          baseUrl,
          useBinaryFormat: false,
          interceptors: options.interceptors,
          defaultTimeoutMs,
          fetch: fetchFn,
        });

  return {
    baseUrl,
    protocol,
    defaultTimeoutMs,
    underlying,
    unary(service, method, input, callOptions) {
      return connectJsonUnary(
        baseUrl,
        service,
        method,
        input,
        callOptions,
        defaultTimeoutMs,
        defaultHeaders,
        fetchFn,
      );
    },
    async close() {
      // No persistent resources for the fetch-based transport.
    },
  };
}

/**
 * Perform a single Connect-JSON unary RPC.
 *
 * This implements the subset of the Connect protocol needed for unary calls:
 * request framing (JSON body, `Content-Type: application/json`,
 * `Connect-Protocol-Version: 1`), timeout handling (local abort + the
 * `Connect-Timeout-Ms` header for servers that honour it), and response
 * parsing (JSON message on success, JSON `{code,message,details}` envelope on
 * error). Errors are normalised to {@link QuarkError} subclasses via
 * {@link fromConnectError}.
 */
async function connectJsonUnary(
  baseUrl: string,
  service: string,
  method: string,
  input: unknown,
  callOptions: QuarkCallOptions | undefined,
  defaultTimeoutMs: number | undefined,
  defaultHeaders: Headers,
  fetchFn: typeof fetch,
): Promise<unknown> {
  // Build the request URL. The Connect spec uses `/{package.Service}/{Method}`
  // rooted at the transport's baseUrl.
  const url = `${baseUrl}/${service}/${method}`;

  // Merge headers: defaults first, then per-call overrides.
  const headers = new Headers(defaultHeaders);
  if (callOptions?.headers) {
    new Headers(callOptions.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  // The Connect-Protocol-Version header opts the server into the Connect
  // protocol and is required for streaming; harmless for unary.
  headers.set('Connect-Protocol-Version', '1');

  // Resolve the effective deadline. A non-positive value disables the
  // timeout (per CallOptions contract with Connect).
  const timeoutMs =
    callOptions?.timeoutMs !== undefined
      ? callOptions.timeoutMs
      : defaultTimeoutMs;

  // Wire up abort signals: one controller to rule them all, linked to both
  // the caller's signal and the local timeout.
  const controller = new AbortController();
  const callerSignal = callOptions?.signal;
  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort();
    } else {
      callerSignal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });
    }
  }
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (timeoutMs !== undefined && timeoutMs > 0) {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    // In Node, unref the timer so it doesn't keep the event loop alive.
    const maybeTimer = timer as ReturnType<typeof setTimeout> & {
      unref?: () => void;
    };
    if (typeof maybeTimer.unref === 'function') {
      maybeTimer.unref();
    }
    // Surface the deadline to servers that honour Connect-Timeout-Ms.
    if (!headers.has('Connect-Timeout-Ms')) {
      headers.set('Connect-Timeout-Ms', String(timeoutMs));
    }
  }

  let response: Response;
  try {
    response = await fetchFn(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(input ?? {}),
      signal: controller.signal,
      // Node's undici supports `duplex: 'half'` for streaming bodies; for a
      // plain string body it is unnecessary but harmless. Omitted to avoid
      // cross-runtime type friction.
    });
  } catch (err) {
    if (timer) clearTimeout(timer);
    // Distinguish a local timeout from a caller-initiated abort from a
    // genuine network failure.
    if (timedOut) {
      throw new DeadlineExceededError(
        `RPC ${service}/${method} timed out after ${timeoutMs}ms`,
        err,
      );
    }
    if (callerSignal?.aborted) {
      throw new DeadlineExceededError(
        `RPC ${service}/${method} was aborted by the caller`,
        err,
      );
    }
    // Network / DNS / TLS / connection-refused failure.
    throw new ConnectionError(
      `RPC ${service}/${method} failed: ${(err as Error)?.message ?? String(err)}`,
      err,
    );
  }

  if (timer) clearTimeout(timer);

  // Always read the body to completion so the underlying socket can be
  // reused (keep-alive).
  const text = await response.text();

  if (!response.ok) {
    // Non-2xx → Connect error envelope (or fall back to HTTP status).
    let code: Code = codeFromHttpStatus(response.status);
    let message = response.statusText || `HTTP ${response.status}`;
    // Preserve error details for callers that want to inspect them; we attach
    // them to the thrown ConnectError so fromConnectError() can reach them
    // via the cause.
    let details: unknown[] | undefined;
    if (text) {
      try {
        const body = JSON.parse(text) as {
          code?: string;
          message?: string;
          details?: unknown[];
        };
        if (body && typeof body.code === 'string') {
          const mapped = codeFromWireName(body.code);
          if (mapped !== undefined) code = mapped;
        }
        if (body && typeof body.message === 'string' && body.message.length > 0) {
          message = body.message;
        }
        if (body && Array.isArray(body.details) && body.details.length > 0) {
          details = body.details;
        }
      } catch {
        // Body wasn't JSON — keep the HTTP-derived code and status text.
      }
    }
    const ce = new ConnectError(message, code);
    if (details) {
      (ce as { details?: unknown[] }).details = details as never;
    }
    throw fromConnectError(ce);
  }

  // 2xx → success body is the JSON-encoded response message. An empty body
  // decodes to an empty object (the response message for e.g. `Empty`).
  if (text.length === 0) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new ConnectionError(
      `RPC ${service}/${method} returned a non-JSON response body`,
      err,
    );
  }
}
