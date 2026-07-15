/**
 * @quarkloop/quark-js — Unified TypeScript client SDK for the Quark platform.
 *
 * The SDK speaks gRPC to the four Quark components — auth, server, node, and
 * workflow — using the Connect-RPC wire protocol over HTTP. A single
 * {@link QuarkClient} facade exposes service clients directly — no
 * intermediate wrapper classes.
 *
 * ```ts
 * import { QuarkClientBuilder, QuarkError } from '@quarkloop/quark-js';
 *
 * const quark = await new QuarkClientBuilder()
 *   .authEndpoint('https://auth.example.com')
 *   .nodeEndpoint('https://node.example.com')
 *   .accessToken('<jwt>')
 *   .requestTimeout(15_000)
 *   .build();
 *
 * try {
 *   const result = await quark.node().execute({ nodeUri: '…', input: { … } });
 * } catch (err) {
 *   if (err instanceof QuarkError) {
 *     console.error(err.code, err.message);
 *   }
 * }
 * ```
 */

// Facade + builder.
export { QuarkClient } from './client.ts';
export type { QuarkClientConfig } from './client.ts';
export { QuarkClientBuilder } from './client-builder.ts';

// Errors.
export {
  QuarkError,
  UnauthenticatedError,
  NotFoundError,
  PermissionDeniedError,
  AlreadyExistsError,
  UnavailableError,
  DeadlineExceededError,
  InvalidArgumentError,
  ConnectionError,
  fromConnectError,
  codeFromHttpStatus,
  codeFromWireName,
} from './errors.ts';
export type { QuarkErrorCode } from './errors.ts';

// Service classes (re-exported so consumers can import them directly and
// so that `instanceof` checks work).
export {
  AuthService,
  UserService,
  IdentityService,
  MFAService,
  PasskeyService,
  SSOService,
  OAuthServerService,
  AdminService,
  OrganizationService,
  ProjectService,
  WorkspaceService,
  RoleService,
  PolicyService,
} from './services/auth.ts';

export { ControlPlaneService } from './services/server.ts';
export { NodeService } from './services/node.ts';
export { WorkflowService } from './services/workflow.ts';

// Transport-layer types (advanced use).
export {
  createQuarkTransport,
  ServiceClient,
} from './transport.ts';
export type {
  QuarkTransport,
  QuarkTransportOptions,
  QuarkProtocol,
  QuarkCallOptions,
  QuarkHeadersInit,
} from './transport.ts';
