/**
 * Error model for the Quarkloop gRPC client SDK.
 *
 * Every failure surfaced by this SDK — whether it originates from a Connect-RPC
 * status code returned by the server, a network/transport failure, or a local
 * precondition violation — is represented as a {@link QuarkError} subclass.
 *
 * The {@link QuarkError.code} field is a stable string identifier suitable for
 * programmatic handling. The string values mirror the gRPC/Connect status code
 * names (uppercased), plus {@link ConnectionError} for transport-layer failures
 * that never produced a server-side status.
 *
 * The mapping from a Connect-RPC error (or any thrown value) to a
 * {@link QuarkError} is centralised in {@link fromConnectError}.
 */

import { Code, ConnectError } from '@connectrpc/connect';

/**
 * Stable string codes carried by {@link QuarkError} instances.
 *
 * These mirror the gRPC/Connect status code names (uppercased) and add
 * `CONNECTION_ERROR` for transport-layer failures (network unreachable, DNS
 * failure, TLS handshake failure, etc.) that never produced a server-side
 * status. `UNKNOWN` is the catch-all for codes without a dedicated subclass
 * (e.g. `INTERNAL`, `DATA_LOSS`, `CANCELLED`).
 */
export type QuarkErrorCode =
  | 'UNAUTHENTICATED'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'ALREADY_EXISTS'
  | 'UNAVAILABLE'
  | 'DEADLINE_EXCEEDED'
  | 'INVALID_ARGUMENT'
  | 'CONNECTION_ERROR'
  | 'UNKNOWN';

/**
 * Base class for every error thrown by this SDK.
 *
 * Subclasses are provided for the gRPC status codes that callers are most
 * likely to handle programmatically; everything else falls back to a plain
 * {@link QuarkError} with `code: 'UNKNOWN'`.
 */
export class QuarkError extends Error {
  /** Stable string code — see {@link QuarkErrorCode}. */
  readonly code: string;
  /** The original value that caused this error, if any (e.g. a {@link ConnectError}). */
  readonly cause?: unknown;

  constructor(message: string, code: string = 'UNKNOWN', cause?: unknown) {
    super(message);
    this.name = 'QuarkError';
    this.code = code;
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
    // Restore prototype chain for transpiled environments where `extends Error`
    // can break `instanceof`. This is a no-op in native ES2022 runtimes.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** gRPC code `UNAUTHENTICATED` (16) — the request lacks valid credentials. */
export class UnauthenticatedError extends QuarkError {
  constructor(message: string, cause?: unknown) {
    super(message, 'UNAUTHENTICATED', cause);
    this.name = 'UnauthenticatedError';
  }
}

/** gRPC code `NOT_FOUND` (5) — the requested entity does not exist. */
export class NotFoundError extends QuarkError {
  constructor(message: string, cause?: unknown) {
    super(message, 'NOT_FOUND', cause);
    this.name = 'NotFoundError';
  }
}

/** gRPC code `PERMISSION_DENIED` (7) — the caller is authenticated but not authorised. */
export class PermissionDeniedError extends QuarkError {
  constructor(message: string, cause?: unknown) {
    super(message, 'PERMISSION_DENIED', cause);
    this.name = 'PermissionDeniedError';
  }
}

/** gRPC code `ALREADY_EXISTS` (6) — the entity the caller tried to create already exists. */
export class AlreadyExistsError extends QuarkError {
  constructor(message: string, cause?: unknown) {
    super(message, 'ALREADY_EXISTS', cause);
    this.name = 'AlreadyExistsError';
  }
}

/** gRPC code `UNAVAILABLE` (14) — the service is temporarily unavailable; retry with backoff. */
export class UnavailableError extends QuarkError {
  constructor(message: string, cause?: unknown) {
    super(message, 'UNAVAILABLE', cause);
    this.name = 'UnavailableError';
  }
}

/** gRPC code `DEADLINE_EXCEEDED` (4) — the RPC exceeded its deadline before completing. */
export class DeadlineExceededError extends QuarkError {
  constructor(message: string, cause?: unknown) {
    super(message, 'DEADLINE_EXCEEDED', cause);
    this.name = 'DeadlineExceededError';
  }
}

/** gRPC code `INVALID_ARGUMENT` (3) — the client supplied a malformed request. */
export class InvalidArgumentError extends QuarkError {
  constructor(message: string, cause?: unknown) {
    super(message, 'INVALID_ARGUMENT', cause);
    this.name = 'InvalidArgumentError';
  }
}

/**
 * Transport-layer failure — the request never reached a state where the server
 * could return a gRPC status. Examples: DNS resolution failure, connection
 * refused, TLS handshake failure, network reset, fetch aborted before any
 * response was received.
 */
export class ConnectionError extends QuarkError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CONNECTION_ERROR', cause);
    this.name = 'ConnectionError';
  }
}

/**
 * Names of Connect-RPC error codes as they appear on the wire (lowercase,
 * snake_case), mapped to the {@link Code} enum values. This is the inverse of
 * Connect's `codeToString` and is re-implemented here because the Connect
 * package does not export it as part of its public surface.
 *
 * Spec: https://connectrpc.com/docs/protocol#error-codes
 */
const CODE_NAME_TO_CODE: Readonly<Record<string, Code>> = {
  canceled: Code.Canceled,
  unknown: Code.Unknown,
  invalid_argument: Code.InvalidArgument,
  deadline_exceeded: Code.DeadlineExceeded,
  not_found: Code.NotFound,
  already_exists: Code.AlreadyExists,
  permission_denied: Code.PermissionDenied,
  resource_exhausted: Code.ResourceExhausted,
  failed_precondition: Code.FailedPrecondition,
  aborted: Code.Aborted,
  out_of_range: Code.OutOfRange,
  unimplemented: Code.Unimplemented,
  internal: Code.Internal,
  unavailable: Code.Unavailable,
  data_loss: Code.DataLoss,
  unauthenticated: Code.Unauthenticated,
};

/**
 * Convert a Connect wire code name (e.g. `"not_found"`) to a {@link Code}.
 * Returns `undefined` for unknown names so callers can fall back to the HTTP
 * status-derived code.
 */
export function codeFromWireName(name: string): Code | undefined {
  return CODE_NAME_TO_CODE[name.toLowerCase()];
}

/**
 * Map an HTTP status code to a {@link Code} per the Connect specification's
 * HTTP→error-code table. Used as a fallback when the response body does not
 * contain a parseable Connect error envelope.
 *
 * Spec: https://connectrpc.com/docs/protocol/#http-to-error-code
 */
export function codeFromHttpStatus(status: number): Code {
  switch (status) {
    case 400:
      return Code.InvalidArgument;
    case 401:
      return Code.Unauthenticated;
    case 403:
      return Code.PermissionDenied;
    case 404:
      return Code.NotFound;
    case 409:
      return Code.Aborted;
    case 412:
      return Code.FailedPrecondition;
    case 429:
      return Code.ResourceExhausted;
    case 499:
      return Code.Canceled;
    case 500:
      return Code.Unknown;
    case 501:
      return Code.Unimplemented;
    case 503:
      return Code.Unavailable;
    case 504:
      return Code.DeadlineExceeded;
    default:
      return Code.Unknown;
  }
}

/**
 * Heuristic: does this {@link ConnectError} represent a transport-layer
 * failure rather than a server-returned status?
 *
 * The Connect library collapses fetch-level failures (network error, DNS
 * failure, TLS error, etc.) into a {@link ConnectError} with
 * {@link Code.Unknown}. We distinguish those from genuine server-side
 * `Code.Unknown` statuses by inspecting the `cause`: a fetch/network error
 * (typically a `TypeError` with a message like "Failed to fetch" or
 * "fetch failed") is treated as a connection failure.
 */
function looksLikeTransportFailure(err: ConnectError): boolean {
  if (err.code !== Code.Unknown) return false;
  const cause = err.cause as { name?: string; message?: string; code?: string } | undefined;
  if (!cause) return false;
  // Node's undici throws `TypeError` with `cause.code` like `ECONNREFUSED`,
  // `ENOTFOUND`, `ECONNRESET`, `ETIMEDOUT`, `EAI_AGAIN`. Browsers throw
  // `TypeError: Failed to fetch`. Treat any TypeError or any error whose
  // name/message hints at a network condition as transport-level.
  if (cause instanceof TypeError) return true;
  const name = cause.name ?? '';
  const msg = cause.message ?? '';
  if (/fetch|network|socket|dns|tcp|tls|connection/i.test(name + ' ' + msg)) {
    return true;
  }
  // Node system error codes surfaced on the underlying error.
  const sysCode = cause.code ?? '';
  return /^(ECONN|ENOTFOUND|EAI|ETIMEDOUT|EHOST|ENET|EPIPE)/.test(sysCode);
}

/**
 * Map any thrown value — most commonly a {@link ConnectError} produced by the
 * transport, but also raw `fetch` errors and anything else — to a
 * {@link QuarkError}.
 *
 * The mapping is:
 *
 * | Source                                              | Result                          |
 * |-----------------------------------------------------|---------------------------------|
 * | `QuarkError`                                        | returned as-is                  |
 * | `ConnectError` w/ known code                        | matching subclass               |
 * | `ConnectError` w/ `Code.Unknown` + transport cause  | `ConnectionError`               |
 * | `ConnectError` w/ other code                        | `QuarkError` (`code: 'UNKNOWN'`)|
 * | `DOMException` named `AbortError`/`TimeoutError`    | `DeadlineExceededError`         |
 * | `TypeError` (fetch failure)                         | `ConnectionError`               |
 * | other `Error`                                       | `QuarkError` (`code: 'UNKNOWN'`)|
 * | non-`Error` value                                   | `QuarkError` (`code: 'UNKNOWN'`)|
 *
 * This function never throws.
 */
export function fromConnectError(e: unknown): QuarkError {
  // Already a QuarkError — preserve subclass identity, don't double-wrap.
  if (e instanceof QuarkError) {
    return e;
  }

  // Browser/Node fetch aborts surface as DOMException(AbortError|TimeoutError).
  if (e instanceof DOMException && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
    return new DeadlineExceededError(e.message || 'request aborted or timed out', e);
  }

  // Raw TypeError from fetch (browser: "Failed to fetch"; Node: "fetch failed").
  if (e instanceof TypeError) {
    return new ConnectionError(e.message || 'network request failed', e);
  }

  // ConnectError (or anything ConnectError.from accepts). ConnectError.from
  // normalises arbitrary values into a ConnectError.
  const ce = ConnectError.from(e);

  switch (ce.code) {
    case Code.Unauthenticated:
      return new UnauthenticatedError(ce.rawMessage || ce.message, ce);
    case Code.NotFound:
      return new NotFoundError(ce.rawMessage || ce.message, ce);
    case Code.PermissionDenied:
      return new PermissionDeniedError(ce.rawMessage || ce.message, ce);
    case Code.AlreadyExists:
      return new AlreadyExistsError(ce.rawMessage || ce.message, ce);
    case Code.Unavailable:
      return new UnavailableError(ce.rawMessage || ce.message, ce);
    case Code.DeadlineExceeded:
      return new DeadlineExceededError(ce.rawMessage || ce.message, ce);
    case Code.InvalidArgument:
      return new InvalidArgumentError(ce.rawMessage || ce.message, ce);
    case Code.Canceled:
      // A cancel with no preceding response is a client-side abort; surface
      // as a deadline so callers can treat it uniformly with timeouts.
      return new DeadlineExceededError(ce.rawMessage || ce.message, ce);
    default:
      // Code.Unknown, Code.Internal, Code.DataLoss, Code.ResourceExhausted,
      // Code.FailedPrecondition, Code.Aborted, Code.OutOfRange,
      // Code.Unimplemented → either a transport failure or a generic status.
      if (looksLikeTransportFailure(ce)) {
        return new ConnectionError(ce.rawMessage || ce.message, ce);
      }
      return new QuarkError(ce.rawMessage || ce.message, 'UNKNOWN', ce);
  }
}
