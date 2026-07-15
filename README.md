# Quark JS SDK

Unified TypeScript client SDK for the Quark platform. Talks gRPC to the four Quark components — **auth**, **server**, **node**, and **workflow** — over the [Connect-RPC](https://connectrpc.com/) wire protocol using `@connectrpc/connect` + `@connectrpc/connect-web`.

Licensed under the MIT License.

## Overview

- **Single facade.** One `QuarkClient` exposes the subset of sub-clients you configured on a fluent `QuarkClientBuilder`.
- **No build step.** The package ships source TypeScript. Bun, Deno, and modern bundlers consume `.ts` directly.
- **ESM-only.** `"type": "module"`.
- **Typed errors.** Every failure — server status, transport failure, local precondition — is a `QuarkError` subclass with a stable `code` string.

## Status: Proto-Codegen Pending

This SDK is wired against the live gRPC services, but generated TypeScript types from `buf generate` are **not yet** included. Until they land:

- Every RPC method takes `request: unknown` and returns `Promise<unknown>`.
- At runtime, requests are sent as Connect-JSON and responses are parsed as JSON, so the SDK is fully functional today.
- Each service class's method names are stable and match the proto RPC names (lowerCamelCased). When codegen lands, each class will narrow its signatures to the generated request/response types without changing names.

The builder, facade, transport layer, and error model are all final.

## Install

```bash
bun add @quarkloop/quark-js
# or
npm install @quarkloop/quark-js
```

Node.js ≥ 20 (global `fetch`) or any modern browser is required. In environments without a global `fetch`, pass one to the builder via `.fetch(myFetch)`.

## Quick Start

```ts
import {
  QuarkClientBuilder,
  QuarkError,
  UnauthenticatedError,
  NotFoundError,
} from '@quarkloop/quark-js';

const quark = await new QuarkClientBuilder()
  .authEndpoint('https://auth.example.com')
  .serverEndpoint('https://controlplane.example.com')
  .nodeEndpoint('https://node.example.com')
  .workflowEndpoint('https://workflow.example.com')
  .workflowNamespace('my-org/my-project')
  .workflowIdentity('user-123')
  .accessToken('<jwt access token>')
  .requestTimeout(15_000)
  .build();

try {
  // Auth: log in with an API key.
  const session = await quark.auth().auth().login({
    handle: 'reza',
    apiKey: 'secret-api-key',
  });

  // Server: fetch the service registry.
  const registry = await quark.server().controlPlane().getServiceRegistry({});

  // Node: execute a node.
  const result = await quark.node().node().execute({
    apiVersion: 'v1',
    requestId: crypto.randomUUID(),
    nodeUri: 'myorg/myteam/validate:v1',
    input: { servers: ['nats://localhost:4222'] },
    deadlineMs: 5000,
  });

  // Workflow: start a run.
  const run = await quark.workflow().workflow().startRun({
    workflowId: 'wf-deploy',
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

## Sub-Clients

Each sub-client is constructed only if the corresponding `*Endpoint(url)` was called on the builder. Accessors on `QuarkClient` throw if the sub-client was not configured; use the `hasAuth()` / `hasServer()` / `hasNode()` / `hasWorkflow()` guards to check without throwing.

### `AuthClient` — `platform.auth.v1` (115 RPCs across 13 services)

```ts
quark.auth().auth()        // AuthService         — 19 RPCs
quark.auth().users()       // UserService         —  7 RPCs
quark.auth().identity()    // IdentityService     —  3 RPCs
quark.auth().mfa()         // MFAService          —  5 RPCs
quark.auth().passkey()     // PasskeyService      —  7 RPCs
quark.auth().sso()         // SSOService          —  3 RPCs
quark.auth().oauthServer() // OAuthServerService  —  8 RPCs
quark.auth().admin()       // AdminService        — 28 RPCs
quark.auth().organization()// OrganizationService —  8 RPCs
quark.auth().project()     // ProjectService      —  8 RPCs
quark.auth().workspace()   // WorkspaceService    —  8 RPCs
quark.auth().role()        // RoleService         —  7 RPCs
quark.auth().policy()      // PolicyService       —  4 RPCs
```

### `ServerClient` — `platform.controlplane.v1.ControlPlaneService` (8 RPCs)

```ts
quark.server().controlPlane().getServiceRegistry({});
quark.server().controlPlane().deploy({ versionId: 'v1.2.3', workflowId: 'wf-deploy' });
quark.server().controlPlane().rollback({ deploymentId: 'dpl-123' });
quark.server().controlPlane().getDeployment({ id: 'dpl-123' });
quark.server().controlPlane().listDeployments({ query: { page: 1, pageSize: 20 } });
quark.server().controlPlane().provisionTenant({ orgName: 'Acme', orgSlug: 'acme' });
quark.server().controlPlane().listTenants({ query: { page: 1, pageSize: 20 } });
quark.server().controlPlane().getSystemHealth({});
```

### `NodeClient` — `quark.node.v1.NodeService` (7 RPCs)

```ts
quark.node().node().execute({ nodeUri: '…', input: {}, deadlineMs: 5000 });
quark.node().node().cancel({ requestId: 'req-123', reason: 'user-aborted' });
quark.node().node().health({});
quark.node().node().ready({});
quark.node().node().status({});
quark.node().node().drain({ timeoutMs: 30_000 });
quark.node().node().shutdown({ force: false });
```

### `WorkflowClient` — `platform.workflow.v1.WorkflowService` (9 RPCs)

```ts
quark.workflow().workflow().createWorkflow({ name: 'wf-deploy' });
quark.workflow().workflow().getWorkflow({ id: 'wf-1' });
quark.workflow().workflow().listWorkflows({ query: { page: 1, pageSize: 20 } });
quark.workflow().workflow().updateWorkflow({ id: 'wf-1', name: 'wf-deploy-v2' });
quark.workflow().workflow().deleteWorkflow({ id: 'wf-1' });
quark.workflow().workflow().startRun({ workflowId: 'wf-1' });
quark.workflow().workflow().getRun({ id: 'run-1' });
quark.workflow().workflow().cancelRun({ id: 'run-1' });
quark.workflow().workflow().listRuns({ query: { page: 1, pageSize: 20 }, workflowId: 'wf-1' });
```

## Per-Call Options

Every RPC method accepts an optional `QuarkCallOptions` as its second argument:

```ts
import type { QuarkCallOptions } from '@quarkloop/quark-js';

const opts: QuarkCallOptions = {
  timeoutMs: 5_000,
  headers: { 'X-Trace-Id': 'abc' },
  signal: controller.signal,
};

await quark.node().node().execute({ nodeUri: '…', input: {} }, opts);
```

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
├── src/
│   ├── index.ts                  # Public API barrel
│   ├── errors.ts                 # QuarkError + 8 subclasses + fromConnectError
│   ├── transport.ts              # Internal: QuarkTransport, Connect-JSON unary
│   ├── client.ts                 # QuarkClient facade
│   ├── client-builder.ts         # QuarkClientBuilder fluent builder
│   └── services/
│       ├── auth.ts               # AuthClient + 13 service classes (115 RPCs)
│       ├── server.ts             # ServerClient + ControlPlaneService (8 RPCs)
│       ├── node.ts               # NodeClient + NodeService (7 RPCs)
│       └── workflow.ts           # WorkflowClient + WorkflowService (9 RPCs)
├── package.json
├── tsconfig.json
├── AGENTS.md
├── LICENSE
└── README.md
```

## Development

```bash
npm install
npm run typecheck    # tsc --noEmit — must pass with zero errors
```

There is no build step and no `dist/`. The package ships source TypeScript directly.

## License

[MIT](LICENSE)
