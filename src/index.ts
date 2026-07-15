/**
 * @quarkloop/quark-js — Unified TypeScript client SDK for the Quark platform.
 *
 * The SDK speaks gRPC to the four Quark components — auth, server, node, and
 * workflow — using the Connect-RPC wire protocol over HTTP. A single
 * {@link QuarkClient} facade exposes service clients directly.
 *
 * ```ts
 * import { QuarkClientBuilder, QuarkError } from '@quarkloop/quark-js';
 *
 * const quark = await new QuarkClientBuilder()
 *   .authEndpoint('http://127.0.0.1:5001')
 *   .nodeEndpoint('http://127.0.0.1:50051')
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

// Auth (AuthClient extends AuthService — login/signup/etc. are direct).
export {
  AuthClient,
  AuthService,
  UserService,
  IdentityService,
  MFAService,
  PasskeyService,
  SSOService,
  OAuthServerService,
  AdminService,
  RoleService,
  PolicyService,
} from './services/auth.ts';

// Server (ServerClient extends ServerService — deploy/rollback/etc. are direct).
export {
  ServerClient,
  ServerService,
  OrganizationService,
  ProjectService,
  WorkspaceService,
} from './services/server.ts';

// Node.
export { NodeService } from './services/node.ts';

// Workflow.
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
