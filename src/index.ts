/**
 * @quarkloop/quark-js — Unified TypeScript client SDK for the Quarkloop
 * platform.
 *
 * The SDK speaks gRPC to the four Quarkloop components — auth, server
 * (control-plane), node, and workflow — using the Connect-RPC wire protocol
 * over HTTP. A single {@link QuarkClient} facade exposes the subset of
 * sub-clients configured on the {@link QuarkClientBuilder}.
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
 *   const result = await quark.node().node().execute({ nodeUri: '…', input: { … } });
 * } catch (err) {
 *   if (err instanceof QuarkError) {
 *     console.error(err.code, err.message);
 *   }
 * }
 * ```
 *
 * Until `buf generate` is wired up, every RPC method takes a `request: unknown`
 * and returns a `Promise<unknown>`. When generated TypeScript types land, the
 * method signatures will narrow to the generated request/response types but
 * the public API names and the builder/facade wiring will not change.
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

// Sub-clients (re-exported so consumers can `import { AuthClient } from …`
// and so that `instanceof` checks work against these classes).
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
  OrganizationService,
  ProjectService,
  WorkspaceService,
  RoleService,
  PolicyService,
} from './services/auth.ts';

export { ServerClient, ControlPlaneService } from './services/server.ts';
export { NodeClient, NodeService } from './services/node.ts';
export { WorkflowClient, WorkflowService } from './services/workflow.ts';

// Transport-layer types (advanced use — custom transports, typed
// `createClient` once codegen lands).
export {
  createQuarkTransport,
  ServiceClient,
} from './transport.ts';
export type {
  QuarkTransport,
  QuarkTransportOptions,
  QuarkProtocol,
  QuarkCallOptions,
} from './transport.ts';
