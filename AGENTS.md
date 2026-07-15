# Agent Guide

This is the Quarkloop JS SDK — a unified TypeScript client for the Quarkloop
platform. It speaks gRPC to the four Quarkloop components (auth, server,
node, workflow) over the Connect-RPC wire protocol using
`@connectrpc/connect` + `@connectrpc/connect-web`. Make focused, tested
changes that preserve the public API and keep the package ESM-only with no
build step.

## Repository

- **Name**: Quarkloop JS SDK
- **Language**: TypeScript (ESM-only, no build step)
- **License**: Closed-source / proprietary — no license is granted to copy,
  modify, or redistribute.
- **Wire protocol**: Connect-RPC (JSON encoding over HTTP/1.1+) via
  `@connectrpc/connect` and `@connectrpc/connect-web`.

## Quick reference

```bash
# Install dependencies
npm install

# Type-check (must pass with zero errors)
npm run typecheck
```

```bash
# Verify the public API surface (what's exported from index.ts)
node --input-type=module -e "import * as api from './src/index.ts'; console.log(Object.keys(api).sort().join('\n'))"

# Sanity-check that no internal modules leaked into the public API
grep -E "export.*createQuarkTransportInternal|export.*connectJsonUnary" src/index.ts
# (should return nothing — only the documented public API is exported)
```

## Structure

```
quark-js/
├── src/
│   ├── index.ts                  # public API barrel — the package entry point
│   ├── errors.ts                 # QuarkError + 8 subclasses + fromConnectError
│   ├── client.ts                 # QuarkClient — unified facade
│   ├── client-builder.ts         # QuarkClientBuilder — fluent builder
│   └── services/
│       ├── transport.ts          # internal: QuarkTransport, ServiceClient,
│       │                         #         Connect-JSON unary call path
│       ├── auth.ts               # AuthClient + 13 service classes (115 RPCs)
│       ├── server.ts             # ServerClient + ControlPlaneService (8 RPCs)
│       ├── node.ts               # NodeClient + NodeService (7 RPCs)
│       └── workflow.ts           # WorkflowClient + WorkflowService (9 RPCs)
├── package.json                  # ESM ("type": "module"), ships source TS
├── tsconfig.json                 # strict, ES2022, bundler resolution, noEmit
├── AGENTS.md
└── README.md
```

One responsibility per file. The dependency graph is strictly acyclic:

```
index.ts
  ↓
client-builder.ts ──► client.ts ──► services/auth.ts  ─┐
                  └──► services/server.ts  ────────────┤
                  └──► services/node.ts    ────────────┤
                  └──► services/workflow.ts ───────────┤
                                                       ↓
                                              services/transport.ts
                                                       ↓
                                                   errors.ts
```

`ServiceClient` (the abstract base for every gRPC service wrapper) lives in
`services/transport.ts` so that `auth.ts`, `server.ts`, `node.ts`, and
`workflow.ts` share it without cross-importing each other.

Internal helpers (`createQuarkTransport`, `connectJsonUnary`,
`ServiceClient`) are NOT part of the documented public API; only the
facade, the builder, the error classes, the sub-clients, and the
service-wrapper classes are intended for consumers. `ServiceClient` and
`createQuarkTransport` are nonetheless exported from `index.ts` for advanced
use (custom transports, and as the bridge to typed `createClient` once
proto codegen lands).

## Status: proto-codegen pending

`buf generate` is not yet wired up for this package. Until it is:

- Every RPC method on every service class takes `request: unknown` and
  returns `Promise<unknown>`.
- At runtime, requests are sent as Connect-JSON and responses are parsed as
  JSON — the SDK is fully functional today.
- Each service class's method names are stable and match the proto RPC names
  (lowerCamelCased). When codegen lands, each class will narrow its
  signatures to the generated request/response types without changing names
  or the builder/facade wiring.

The builder, facade, transport layer, and error model are all final.

## Wire protocol

The default protocol is **Connect** (JSON encoding). A unary call is:

```
POST {baseUrl}/{package.Service}/{Method} HTTP/1.1
Content-Type: application/json
Accept: application/json
Connect-Protocol-Version: 1
Connect-Timeout-Ms: <deadline>

<JSON-encoded request message>
```

On success (HTTP 2xx) the response body is the JSON-encoded response message.
On failure (HTTP non-2xx) the response body is a JSON object of the shape
`{ "code": "not_found", "message": "...", "details": [...] }`.

gRPC-Web is also selectable via `QuarkClientBuilder.protocol('grpc-web')`.
Until codegen lands, the raw call path still uses Connect-JSON even when
gRPC-Web is selected; the underlying `createGrpcWebTransport` is held for
the future typed-client path.

Do not invent new request shapes or URL patterns. The Connect protocol is
specified at https://connectrpc.com/docs/protocol/.

## Service coverage

| Component | Sub-client       | Service                                    | RPCs |
|-----------|------------------|--------------------------------------------|------|
| auth      | `AuthClient`     | `platform.auth.v1.AuthService`             | 19   |
| auth      | `AuthClient`     | `platform.auth.v1.UserService`             | 7    |
| auth      | `AuthClient`     | `platform.auth.v1.IdentityService`         | 3    |
| auth      | `AuthClient`     | `platform.auth.v1.MFAService`              | 5    |
| auth      | `AuthClient`     | `platform.auth.v1.PasskeyService`          | 7    |
| auth      | `AuthClient`     | `platform.auth.v1.SSOService`              | 3    |
| auth      | `AuthClient`     | `platform.auth.v1.OAuthServerService`      | 8    |
| auth      | `AuthClient`     | `platform.auth.v1.AdminService`            | 28   |
| auth      | `AuthClient`     | `platform.auth.v1.OrganizationService`     | 8    |
| auth      | `AuthClient`     | `platform.auth.v1.ProjectService`          | 8    |
| auth      | `AuthClient`     | `platform.auth.v1.WorkspaceService`        | 8    |
| auth      | `AuthClient`     | `platform.auth.v1.RoleService`             | 7    |
| auth      | `AuthClient`     | `platform.auth.v1.PolicyService`           | 4    |
| server    | `ServerClient`   | `platform.controlplane.v1.ControlPlaneService` | 8 |
| node      | `NodeClient`     | `quark.node.v1.NodeService`                | 7    |
| workflow  | `WorkflowClient` | `platform.workflow.v1.WorkflowService`     | 9    |
| **total** |                  |                                            | **139** |

When a new RPC is added to a `.proto`, add a matching method to the
corresponding service class — same lowerCamelCase name, body
`return this.rpc('PascalCaseRpcName', request, options);`, and a JSDoc
comment. Do not skip RPCs.

## Rules

### API stability

1. Do not break the public API without an explicit major version bump.
2. Do not change `QuarkError.code` string values — they are part of the
   contract with callers.
3. Do not remove or rename exported types from `index.ts` without a major
   version bump.
4. Do not change the builder method names (`authEndpoint`, `serverEndpoint`,
   `nodeEndpoint`, `workflowEndpoint`, `workflowNamespace`,
   `workflowIdentity`, `connectTimeout`, `requestTimeout`, `build`) — they
   are the primary entry points.
5. The `unknown` request/response typing is temporary; when proto codegen
   lands, narrow the types in place without renaming methods.

### Code style

6. Do not disable TypeScript strict mode for individual files.
7. Do not use `require()` — this is an ESM-only package.
8. Do not add a build step — the package ships source TypeScript directly.
9. Do not create a `dist/` directory.
10. One responsibility per file — if a file grows past 150 lines, split it.
    (`services/auth.ts` is the deliberate exception: all 13 auth services
    live together because they share an endpoint and a service descriptor
    prefix.)
11. No circular dependencies — the current source layout is acyclic; keep it
    that way.
12. Comments explain **why**, not **what**.
13. Do not add `// TODO` comments without an accompanying issue link.
14. Import source files with `.ts` extensions
    (`allowImportingTsExtensions` is on; `noEmit` is on).

### Dependencies

15. Do not add new top-level dependencies without discussing in an issue
    first. The runtime surface is intentionally tiny: only
    `@connectrpc/connect` and `@connectrpc/connect-web` (plus
    `@bufbuild/protobuf` which they pull in transitively).
16. Do not add `@connectrpc/connect-node` — the SDK must work in both Node
    and browsers. Use the `fetch`-based `@connectrpc/connect-web` transports.
17. Do not bump `@connectrpc/connect` or `@connectrpc/connect-web` to a new
    major version without re-validating the Connect-JSON call path and the
    `fromConnectError` mapping.

### Testing

18. Run `npm run typecheck` before every commit — it must pass with zero
    errors.
19. When a unit test suite is added, place tests alongside source files
    (`src/services/auth.test.ts`, etc.) and do not mock `fetch` — use a
    real Connect-protocol endpoint (or `createRouterTransport` from
    `@connectrpc/connect` for in-memory fixtures).
20. Do not hardcode endpoint URLs in tests — read them from environment
    variables with sensible defaults.

## Boundaries

The only boundary is between **public API** (exported from `index.ts`) and
**internal implementation** (everything else). Consumers must never import
from internal files. The `exports` field in `package.json` enforces this —
only `.` (the root) is exported.

## Common mistakes to avoid

1. **Using `HeadersInit` as a type.** This package compiles with
   `lib: ["ES2022"]` (no DOM). `HeadersInit` is not a top-level global;
   use the local `QuarkHeadersInit` type from `services/transport.ts`.
   `Headers`, `fetch`, `Response`, `AbortController`, `DOMException`, and
   `setTimeout` ARE globals (via `@types/node`'s undici-backed web globals).

2. **Calling `Headers.prototype.clear()`.** Neither the undici nor the DOM
   `Headers` class has a `clear()` method. To replace headers wholesale,
   construct a fresh `Headers` instance.

3. **Bypassing `fromConnectError`.** Every `catch` in the call path must
   normalise the error via `fromConnectError` (or throw a `QuarkError`
   subclass directly). Never rethrow raw `ConnectError` or `TypeError`
   instances across the public API boundary.

4. **Adding a build step.** The package ships source TypeScript. Do not add
   `tsc` to the build pipeline, do not create a `dist/` directory, do not
   add `prepublishOnly` scripts.

5. **Using CommonJS.** `require()`, `module.exports`, `__dirname`,
   `__filename` — none of these exist in ESM. If you need `__dirname`, use
   `import.meta.url` with `fileURLToPath`.

6. **Breaking the `tsconfig.json` settings.** `allowImportingTsExtensions`,
   `noEmit`, `strict`, `module: "ESNext"`, `moduleResolution: "bundler"`,
   `target: "ES2022"`, `lib: ["ES2022"]` are all required. Removing any of
   them breaks the type-check.

7. **Deep-merging workflow defaults.** The `WorkflowService` merges
   `namespace`/`identity` into requests shallowly. Deep-merge would surprise
   callers who expect nested objects to be replaced. Do not change this.

8. **Making sub-client accessors return `undefined`.** `QuarkClient.auth()`,
   `.server()`, `.node()`, `.workflow()` must throw if the sub-client was
   not configured — never return `undefined`. The `hasAuth()` / `hasServer()`
   / `hasNode()` / `hasWorkflow()` guards exist for callers who want to
   check without throwing.

9. **Skipping RPCs when a `.proto` changes.** Every RPC declared in a
   `.proto` service must have a corresponding method on the service class.
   Do not "simplify" by omitting rarely-used RPCs.

10. **Reusing a builder after `build()`.** `build()` consumes the
    accumulated state. Construct a fresh `QuarkClientBuilder` for each
    client.

## When you're stuck

- Read `src/services/transport.ts` for the Connect-JSON call path and the
  `QuarkTransport` interface.
- Read `src/errors.ts` for the full `fromConnectError` mapping table.
- Read the [Connect protocol spec](https://connectrpc.com/docs/protocol/)
  for wire-format questions.
- Search existing issues and PRs before asking.
- If unsure about a public API change, open an issue and ask before
  implementing.
