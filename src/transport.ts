/**
 * Transport layer for the Quark JS SDK.
 *
 * A {@link QuarkTransport} wraps a Connect-RPC {@link Transport} from
 * `@connectrpc/connect` bound to a single service endpoint (auth, server,
 * node, or workflow). The underlying `Transport` is what `createClient()`
 * consumes — every service class in `src/services/` calls
 * `createClient(serviceDescriptor, transport.underlying)` to obtain a fully
 * typed RPC client.
 *
 * ## Proto lifecycle
 *
 * The .proto files in `proto/` are duplicate copies of the source-of-truth
 * protos owned by the service repositories (auth, server, quark-rs). When a
 * proto changes upstream, the duplicate in this repo is updated in
 * lock-step, and `npm run generate` (which invokes `buf generate`) is
 * re-run to regenerate the TypeScript bindings under `src/gen/`. The
 * generated descriptors (`*_connect.ts`) and message types (`*_pb.ts`) are
 * consumed by the service classes in `src/services/`.
 *
 * ## Wire protocol
 *
 * The Connect protocol (https://connectrpc.com/docs/protocol/) is a gRPC
 * dialect that runs over HTTP/1.1+ and supports JSON encoding natively.
 * `createConnectTransport` from `@connectrpc/connect-web` is used by default;
 * pass `protocol: 'grpc-web'` to {@link createQuarkTransport} for gRPC-Web
 * framing (useful when fronting the services with a gRPC-Web proxy).
 */

import {
  createConnectTransport,
  createGrpcWebTransport,
} from '@connectrpc/connect-web';
import type {
  Transport,
  Interceptor,
  CallOptions,
} from '@connectrpc/connect';

import {
  ConnectionError,
  fromConnectError,
} from './errors.ts';

/**
 * Wire protocol used by the underlying Connect transport.
 *
 * - `connect`  — Connect-JSON over HTTP/1.1+. Default. JSON encoding keeps
 *   payloads human-readable and works through any HTTP load balancer.
 * - `grpc-web` — gRPC-Web over HTTP/1.1+. Uses binary protobuf framing by
 *   default; pass `useBinaryFormat: true` (the default) to enable it. Use
 *   this when the upstream service is exposed via a gRPC-Web gateway.
 */
export type QuarkProtocol = 'connect' | 'grpc-web';

/**
 * Acceptable shapes for a headers initializer. Mirrors the standard
 * `HeadersInit` from the DOM lib / undici, but defined locally because this
 * package compiles with `lib: ["ES2022"]` (no DOM), where `HeadersInit` is
 * not declared as a top-level global (though it IS the parameter type of
 * the global `Headers` constructor). `Headers` itself is a global via
 * `@types/node`'s undici-backed web globals.
 */
export type QuarkHeadersInit =
  | Record<string, string>
  | string[][]
  | Headers;

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
  /**
   * Whether to use binary protobuf encoding on the wire. Defaults to `false`
   * for `connect` (JSON is human-readable) and `true` for `grpc-web` (binary
   * is the gRPC-Web default). Set explicitly to override.
   */
  useBinaryFormat?: boolean;
  /** Optional `fetch` override (useful in Node without a global `fetch`). */
  fetch?: typeof fetch;
}

/**
 * Per-call options accepted by every RPC method. Maps 1:1 to Connect's
 * `CallOptions` — we re-export it under our own name so callers don't need
 * a direct dep on `@connectrpc/connect` for the common case.
 */
export type QuarkCallOptions = CallOptions;

/**
 * Base class for every gRPC service wrapper in this package.
 *
 * Holds the {@link QuarkTransport} (bound to a single endpoint). Subclasses
 * instantiate a typed Connect-RPC client via `createClient(service, transport)`
 * and expose one method per RPC that delegates to the typed client.
 *
 * Subclasses are responsible for importing the generated service descriptor
 * (from `src/gen/<proto>_connect.ts`) and the generated message types (from
 * `src/gen/<proto>_pb.ts`).
 */
export abstract class ServiceClient {
  constructor(
    protected readonly transport: QuarkTransport,
  ) {}
}

/**
 * A transport bound to a single service endpoint.
 *
 * Each Quark service (auth, server, node, workflow) gets its own
 * {@link QuarkTransport} instance because they may live on different hosts
 * and ports.
 *
 * The underlying Connect `Transport` is the primary code path: service
 * classes call `createClient(serviceDesc, transport.underlying)` and get a
 * fully typed RPC client. There is no raw-fetch fallback.
 */
export interface QuarkTransport {
  /** The base URL all requests are rooted at. */
  readonly baseUrl: string;
  /** The wire protocol selected at construction time. */
  readonly protocol: QuarkProtocol;
  /** The default per-RPC deadline, if any. */
  readonly defaultTimeoutMs?: number;
  /**
   * The underlying `@connectrpc/connect` transport. Pass this to
   * `createClient(serviceDescriptor, transport)` to obtain a typed RPC
   * client.
   */
  readonly underlying: Transport;
  /**
   * Release any resources held by this transport. The fetch-based Connect
   * transport holds no persistent resources, so this is effectively a
   * no-op today; it exists for API symmetry with future transports (e.g.
   * gRPC over HTTP/2 via `@connectrpc/connect-node`) that do hold a
   * connection pool.
   */
  close(): Promise<void>;
}

/**
 * Build a {@link QuarkTransport} bound to a single endpoint.
 *
 * @throws {ConnectionError} if no global `fetch` is available and no `fetch`
 *   override was supplied via {@link QuarkTransportOptions.fetch}.
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

  // Convert the default Headers into a Connect interceptor that merges
  // them into every outgoing request. The Connect transport itself does
  // not accept a `headers` option — the standard pattern is to inject
  // default headers via an interceptor.
  const defaultHeadersRecord = new Headers(options.defaultHeaders);
  const defaultHeadersInterceptor: Interceptor = (next) => async (req) => {
    // Merge default headers into the request headers — caller-supplied
    // per-call headers (already in req.header) take precedence.
    for (const [key, value] of defaultHeadersRecord.entries()) {
      if (!req.header.has(key)) {
        req.header.set(key, value);
      }
    }
    return await next(req);
  };

  // Resolve the binary-format flag. The defaults match the upstream
  // conventions: Connect-JSON for `connect`, binary protobuf for `grpc-web`.
  const useBinaryFormat =
    options.useBinaryFormat ?? protocol === 'grpc-web';

  // Wrap interceptors so ConnectError thrown at the transport layer is
  // normalised to a QuarkError subclass before reaching user code. We do
  // this here (rather than at the call site) so all RPCs — including
  // any future streaming RPCs — get the same error normalisation.
  const errorNormalisingInterceptor: Interceptor = (next) => async (req) => {
    try {
      return await next(req);
    } catch (err) {
      // ConnectError is the canonical error type from @connectrpc/connect.
      // `fromConnectError` maps it (and other shapes) to a QuarkError subclass.
      throw fromConnectError(err);
    }
  };
  const interceptors: Interceptor[] = [
    defaultHeadersInterceptor,
    ...(options.interceptors ?? []),
    errorNormalisingInterceptor,
  ];

  const underlying: Transport =
    protocol === 'grpc-web'
      ? createGrpcWebTransport({
          baseUrl,
          useBinaryFormat,
          interceptors,
          defaultTimeoutMs,
          fetch: fetchFn,
        })
      : createConnectTransport({
          baseUrl,
          useBinaryFormat,
          interceptors,
          defaultTimeoutMs,
          fetch: fetchFn,
        });

  return {
    baseUrl,
    protocol,
    defaultTimeoutMs,
    underlying,
    async close() {
      // No persistent resources for the fetch-based Connect transport.
      // The underlying Connect transport does not expose a `close()` method.
    },
  };
}
