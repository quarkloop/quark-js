# Quark JS SDK

Unified TypeScript client SDK for the Quark platform. Talks gRPC to the four Quark components — **auth**, **server**, **node**, and **workflow** — over the [Connect-RPC](https://connectrpc.com/) wire protocol using `@connectrpc/connect` + `@connectrpc/connect-web`.

Licensed under the MIT License.

## Overview

- **Single facade.** One `QuarkClient` exposes the subset of service clients you configured on a fluent `QuarkClientBuilder`.
- **Fully typed.** Request/response message types and service descriptors are generated from the .proto contracts via `buf generate` (`@bufbuild/protoc-gen-es`). Every RPC method takes a typed request and returns a typed response.
- **No build step.** The package ships source TypeScript. Bun, Deno, and modern bundlers consume `.ts` directly.
- **ESM-only.** `"type": "module"`.
- **Typed errors.** Every failure — server status, transport failure, local precondition — is a `QuarkError` subclass with a stable `code` string.

## Proto Lifecycle

The .proto files in `proto/` are duplicate copies of the source-of-truth protos owned by the upstream service repositories:

| File | Source repo | Notes |
|---|---|---|
| `proto/auth.proto`, `proto/common/*.proto` | [auth](https://github.com/quarkloop/auth) | 10 services (Auth/User/Identity/MFA/Passkey/SSO/OAuthServer/Admin/Role/Policy) |
| `proto/server.proto`, `proto/nodes.proto`, `proto/release.proto`, `proto/secrets.proto`, `proto/workflow.proto` | [server](https://github.com/quarkloop/server) | 4 services (Server/Organization/Project/Workspace) + auxiliary protos |
| `proto/node.proto` | [quark-rs](https://github.com/quarkloop/quark-rs) (crates/quark-node-proto) | Node execution daemon (7 RPCs) |
| `proto/google/protobuf/*.proto` | protoc runtime include | Well-known types (Empty, Timestamp, Struct) — vendored for offline codegen |

When a proto changes upstream:

1. Update the duplicate in `proto/` (must match upstream byte-for-byte).
2. Run `npm run generate` — this invokes `buf generate` which runs `@bufbuild/protoc-gen-es` to regenerate `src/gen/*_pb.ts`.
3. Run `python3 scripts/generate_quark_js_services.py` to regenerate the typed service wrapper classes in `src/services/`.
4. Run `npm run typecheck` to verify the SDK still compiles.

The generated `src/gen/*_pb.ts` files contain:

- **Message types** (`LoginRequest`, `User`, `Organization`, …) — typed request/response shapes for every proto message.
- **Service descriptors** (`AuthService`, `ServerService`, `NodeService`, …) — typed `GenService` descriptors that satisfy `DescService` from `@bufbuild/protobuf` and can be passed to `createClient(descriptor, transport)` from `@connectrpc/connect`.

## Install

```bash
bun add @quarkloop/quark
# or
npm install @quarkloop/quark
```

Node.js ≥ 20 (global `fetch`) or any modern browser is required. In environments without a global `fetch`, pass one to the builder via `.fetch(myFetch)`.

## Quick Start

```ts
import {
  QuarkClientBuilder,
  QuarkError,
  UnauthenticatedError,
  NotFoundError,
} from '@quarkloop/quark';

const quark = await new QuarkClientBuilder()
  // Auth, node, workflow endpoints are discovered automatically
  .serverEndpoint('http://127.0.0.1:3000')
  .accessToken('<jwt access token>')
  .requestTimeout(15_000)
  .build();

try {
  // Auth: log in with an API key. Fully typed — request is LoginRequest,
  // response is LoginResponse.
  const session = await quark.auth().login({
    handle: 'admin',
    apiKey: 'your-api-key',
  });

  // Server: fetch the service registry. Request is Empty, response is
  // ServiceRegistry.
  // Service discovery is automatic — service discovery is automatic

  // Node: execute a node. Request is ExecuteRequest, response is
  // ExecuteResponse.
  const result = await quark.node().execute({
    apiVersion: 'v1',
    requestId: crypto.randomUUID(),
    nodeUri: 'myorg/myteam/validate:v1',
    input: new Struct(),
    deadlineMs: 5000,
  });

  // Workflow: start a run. Request is StartRunRequest, response is Run.
  const run = await quark.workflow().startRun({
    workflowId: 'wf-deploy',
    input: new Uint8Array(),
  });
} catch (err) {
  if (err instanceof UnauthenticatedError) {
    // re-login
  } else if (err instanceof NotFoundError) {
    // entity missing
  } else if (err instanceof QuarkError) {
    console.error(err.code, err.message);
  } else {
    throw err;
  }
} finally {
  await quark.close();
}
```

## Service Accessors

Each service is constructed only if the corresponding `*Endpoint(url)` was called on the builder. Accessors on `QuarkClient` throw if the endpoint was not configured; use the `hasAuth()` / `hasServer()` / `hasNode()` / `hasWorkflow()` guards to check without throwing.

### Auth — `AuthClient` (extends `AuthService`)

`AuthClient` extends `AuthService`, so all 19 authentication RPCs (`login`, `signup`, `token`, `verify`, etc.) are callable directly. The remaining 9 services are accessed via accessors:

```ts
quark.auth().login({ handle: 'admin', apiKey: '…' });     // AuthService — 19 RPCs (direct)
quark.auth().users().createUser({ … });                    // UserService — 7 RPCs
quark.auth().identity().listIdentities({ … });             // IdentityService — 3 RPCs
quark.auth().mfa().enrollFactor({ … });                    // MFAService — 5 RPCs
quark.auth().passkey().passkeyRegistrationOptions({ … });  // PasskeyService — 7 RPCs
quark.auth().sso().ssoRedirect({ … });                     // SSOService — 3 RPCs
quark.auth().oauthServer().oauthServerAuthorize({ … });    // OAuthServerService — 8 RPCs
quark.auth().admin().adminListUsers({ … });                // AdminService — 28 RPCs
quark.auth().role().createRole({ … });                     // RoleService — 7 RPCs
quark.auth().policy().createPolicy({ … });                 // PolicyService — 4 RPCs
```

### Server — `ServerClient` (extends `ServerService`)

`ServerClient` extends `ServerService`, so all 7 server RPCs (`deploy`, `rollback`, etc.) are callable directly. Organization, Project, and Workspace services are accessed via accessors:

```ts
// Service discovery is automatic
quark.server().deploy({ versionId: 'v1.2.3', workflowId: 'wf-deploy' });
quark.server().rollback({ deploymentId: 'dpl-123' });
quark.server().getDeployment({ id: 'dpl-123' });
quark.server().listDeployments({ query: { limit: 20, offset: 0 } });
quark.server().provisionTenant({ orgName: 'Acme', orgSlug: 'acme' });
quark.server().listTenants({ query: { limit: 20, offset: 0 } });
quark.server().getSystemHealth();
quark.server().organization().createOrganization({ … });    // OrganizationService — 8 RPCs
quark.server().project().createProject({ … });              // ProjectService — 8 RPCs
quark.server().workspace().createWorkspace({ … });          // WorkspaceService — 8 RPCs
```

### Node — `NodeService` (7 RPCs)

```ts
quark.node().execute({ nodeUri: '…', input: …, deadlineMs: 5000 });
quark.node().cancel({ requestId: 'req-123', reason: 'user-aborted' });
quark.node().health();
quark.node().ready();
quark.node().status();
quark.node().drain({ timeoutMs: 30_000 });
quark.node().shutdown({ force: false });
```

### Workflow — `WorkflowService` (9 RPCs)

```ts
quark.workflow().createWorkflow({ name: 'wf-deploy' });
quark.workflow().getWorkflow({ id: 'wf-1' });
quark.workflow().listWorkflows({ query: { limit: 20, offset: 0 } });
quark.workflow().updateWorkflow({ id: 'wf-1', name: 'wf-deploy-v2' });
quark.workflow().deleteWorkflow({ id: 'wf-1' });
quark.workflow().startRun({ workflowId: 'wf-1', input: new Uint8Array() });
quark.workflow().getRun({ id: 'run-1' });
quark.workflow().cancelRun({ id: 'run-1' });
quark.workflow().listRuns({ query: { page: 1, pageSize: 20 }, workflowId: 'wf-1' });
```

## Per-Call Options

Every RPC method accepts an optional `QuarkCallOptions` as its second argument:

```ts
import type { QuarkCallOptions } from '@quarkloop/quark';

const opts: QuarkCallOptions = {
  timeoutMs: 5_000,
  headers: { 'X-Trace-Id': 'abc' },
  signal: controller.signal,
};

await quark.node().execute({ nodeUri: '…', input: … }, opts);
```

## Generated Types

The generated message types and service descriptors are re-exported under namespace barrels so callers can import them directly:

```ts
import { authGen, serverGen, nodeGen, workflowGen, commonGen } from '@quarkloop/quark';

// Typed message shapes:
const req: authGen.LoginRequest = { handle: 'admin', apiKey: '…' };
const user: authGen.User = { id: 'u1', handle: 'admin', status: 1 };

// Service descriptor — pass to createClient() for advanced use:
import { createClient } from '@connectrpc/connect';
const typedClient = createClient(authGen.AuthService, transport.underlying);
```

Each namespace corresponds to one .proto file:

| Namespace | Source proto | Contents |
|---|---|---|
| `authGen` | `proto/auth.proto` | All auth message types + 10 service descriptors |
| `serverGen` | `proto/server.proto` | Server message types + 4 service descriptors |
| `nodeGen` | `proto/node.proto` | Node message types + NodeService descriptor |
| `workflowGen` | `proto/workflow.proto` | Workflow message types + WorkflowService descriptor |
| `commonGen` | `proto/common/identities.proto` | Shared types (Identity, LifecycleState, Timestamps) |

## Errors

All errors thrown by the SDK extend `QuarkError` with a stable `code` string.

| Class | `code` | When |
|---|---|---|
| `UnauthenticatedError` | `UNAUTHENTICATED` | gRPC code 16 — request lacks valid credentials |
| `NotFoundError` | `NOT_FOUND` | gRPC code 5 — entity not found |
| `PermissionDeniedError` | `PERMISSION_DENIED` | gRPC code 7 — caller authenticated but not authorised |
| `AlreadyExistsError` | `ALREADY_EXISTS` | gRPC code 6 — entity already exists |
| `UnavailableError` | `UNAVAILABLE` | gRPC code 14 — service temporarily unavailable |
| `DeadlineExceededError` | `DEADLINE_EXCEEDED` | gRPC code 4 — RPC exceeded its deadline |
| `InvalidArgumentError` | `INVALID_ARGUMENT` | gRPC code 3 — malformed request |
| `ConnectionError` | `CONNECTION_ERROR` | Transport failure (DNS, TLS, connection refused, …) |
| `QuarkError` | `UNKNOWN` | Any other gRPC code or unknown cause |

## Repository Layout

```
quark-js/
├── proto/                        # Duplicate .proto contracts (sourced from upstream repos)
│   ├── auth.proto                # from github.com/quarkloop/auth
│   ├── server.proto              # from github.com/quarkloop/server
│   ├── node.proto                # from github.com/quarkloop/quark-rs
│   ├── nodes.proto, release.proto, secrets.proto, workflow.proto
│   ├── common/{errors,identities,paging}.proto
│   └── google/protobuf/{empty,timestamp,struct}.proto
├── buf.yaml                      # buf module config (lint + breaking rules)
├── buf.gen.yaml                  # codegen config (protoc-gen-es → src/gen/)
├── src/
│   ├── index.ts                  # Public API barrel
│   ├── errors.ts                 # QuarkError + 8 subclasses + fromConnectError
│   ├── transport.ts              # QuarkTransport wrapping @connectrpc/connect Transport
│   ├── client.ts                 # QuarkClient facade
│   ├── client-builder.ts         # QuarkClientBuilder fluent builder
│   ├── services/                 # Typed service wrappers (auto-generated by scripts/)
│   │   ├── auth.ts               # AuthClient + 10 service classes (91 RPCs)
│   │   ├── server.ts             # ServerClient + 4 service classes (32 RPCs)
│   │   ├── node.ts               # NodeService (7 RPCs)
│   │   └── workflow.ts           # WorkflowService (9 RPCs)
│   └── gen/                      # Generated by `npm run generate` — DO NOT EDIT
│       ├── auth_pb.ts
│       ├── server_pb.ts
│       ├── node_pb.ts
│       ├── workflow_pb.ts
│       └── common/, google/protobuf/
├── package.json
├── tsconfig.json
├── AGENTS.md
├── LICENSE
└── README.md
```

## Development

```bash
npm install
npm run generate     # regenerate src/gen/*_pb.ts from proto/
                    # then run: python3 scripts/generate_quark_js_services.py
npm run typecheck    # tsc --noEmit — must pass with zero errors
```

There is no build step and no `dist/`. The package ships source TypeScript directly.

## License

[MIT](LICENSE)
