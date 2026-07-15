/**
 * @quarkloop/quark-js — Unified TypeScript client SDK for the Quark platform.
 *
 * The SDK speaks gRPC to the four Quark components — auth, server, node, and
 * workflow — using the Connect-RPC wire protocol over HTTP. A single
 * {@link QuarkClient} facade exposes service clients directly.
 *
 * Every RPC is fully typed. Request and response message types are generated
 * from the .proto contracts in `proto/` via `buf generate` (using
 * `@bufbuild/protoc-gen-es`) into `src/gen/`. The service wrapper classes in
 * `src/services/` are thin typed wrappers around `createClient()` from
 * `@connectrpc/connect`.
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
 *   const result = await quark.node().execute({ nodeUri: '…', input: … });
 * } catch (err) {
 *   if (err instanceof QuarkError) {
 *     console.error(err.code, err.message);
 *   }
 * }
 * ```
 *
 * ## Proto lifecycle
 *
 * The .proto files in `proto/` are duplicate copies of the source-of-truth
 * protos owned by the service repositories (auth, server, quark-rs). When a
 * proto changes upstream, the duplicate in this repo MUST be updated in
 * lock-step. Run `npm run generate` to regenerate the TypeScript bindings
 * under `src/gen/`, then run `python3 scripts/generate_quark_js_services.py`
 * to regenerate the typed service wrappers under `src/services/`.
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

// ---------------------------------------------------------------------------
// Generated proto types — re-exported so callers can import request/response
// message types and service descriptors from this package directly.
//
// We export each module under a namespace to avoid name collisions between
// proto packages (e.g. `platform.common.v1.Identity` and
// `platform.auth.v1.Identity` are different messages with the same name).
//
// Usage:
//   import { authGen, serverGen, nodeGen, workflowGen, commonGen } from '@quarkloop/quark-js';
//
//   const req: authGen.LoginRequest = { handle: '…', apiKey: '…' };
//   const desc = authGen.AuthService; // GenService descriptor for createClient()
//
// To use a service descriptor directly with `createClient()`:
//   import { createClient } from '@connectrpc/connect';
//   import { authGen } from '@quarkloop/quark-js';
//   const client = createClient(authGen.AuthService, transport);
// ---------------------------------------------------------------------------

export * as authGen from './gen/auth_pb.js';
export * as serverGen from './gen/server_pb.js';
export * as nodeGen from './gen/node_pb.js';
export * as workflowGen from './gen/workflow_pb.js';
export * as commonGen from './gen/common/identities_pb.js';
