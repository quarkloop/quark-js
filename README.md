# Quark JS SDK

Unified TypeScript client SDK for the Quarkloop platform. Talks gRPC to the
four quarkloop components — **auth**, **server**, **node**, and **workflow** —
over the [connect-rpc](https://connectrpc.com/) wire protocol using the
`@connectrpc/connect` + `@connectrpc/connect-web` runtime.

licensed under the mit license.

## features

- **single facade.** one `quarkclient` exposes the subset of sub-clients you
  configured on a fluent `quarkclientbuilder`.
- **no build step.** the package ships source typescript. bun, deno, and
  modern bundlers consume `.ts` directly.
- **esm-only.** `"type": "module"`.
- **typed errors.** every failure — server status, transport failure, local
  precondition — is a `quarkerror` subclass with a stable `code` string.

## status: proto-codegen pending

this sdk is wired against the live gRPC services, but generated typescript
types from `buf generate` are **not yet** included. until they land:

- every rpc method takes `request: unknown` and returns `promise<unknown>`.
- at runtime, requests are sent as connect-json and responses are parsed as
  json, so the sdk is fully functional today.
- each service class's method names are stable and match the proto rpc names
  (lowercamelcased). when codegen lands, each class will narrow its signatures
  to the generated request/response types without changing names.

the builder, facade, transport layer, and error model are all final.

## install

```bash
bun add @quarkloop/quark-js
# or
npm install @quarkloop/quark-js
```

node.js ≥ 20 (global `fetch`) or any modern browser is required. in
environments without a global `fetch`, pass one to the builder via
`.fetch(myfetch)`.

## quick start

```ts
import {
  quarkclientbuilder,
  quarkerror,
  unauthenticatederror,
  notfounderror,
} from '@quarkloop/quark-js';

const quark = await new quarkclientbuilder()
  .authendpoint('https://auth.example.com')
  .serverendpoint('https://controlplane.example.com')
  .nodeendpoint('https://node.example.com')
  .workflowendpoint('https://workflow.example.com')
  .workflownamespace('my-org/my-project')
  .workflowidentity('user-123')
  .accesstoken('<jwt access token>')
  .requesttimeout(15_000)
  .build();

try {
  // auth: log in with an api key.
  const session = await quark.auth().auth().login({
    handle: 'reza',
    apikey: 'secret-api-key',
  });

  // server: fetch the service registry.
  const registry = await quark.server().controlplane().getserviceregistry({});

  // node: execute a node.
  const result = await quark.node().node().execute({
    apiversion: 'v1',
    requestid: crypto.randomuuid(),
    nodeuri: 'myorg/myteam/validate:v1',
    input: { servers: ['nats://localhost:4222'] },
    deadlinems: 5000,
  });

  // workflow: start a run.
  const run = await quark.workflow().workflow().startrun({
    workflowid: 'wf-deploy',
  });
} catch (err) {
  if (err instanceof unauthenticatederror) {
    // re-login
  } else if (err instanceof notfounderror) {
    // entity missing
  } else if (err instanceof quarkerror) {
    console.error(err.code, err.message);
  } else {
    throw err;
  }
} finally {
  await quark.close();
}
```

## the four sub-clients

each sub-client is constructed only if the corresponding `*endpoint(url)` was
called on the builder. accessors on `quarkclient` throw if the sub-client was
not configured; use the `hasauth()` / `hasserver()` / `hasnode()` /
`hasworkflow()` guards to check without throwing.

### `authclient` — `platform.auth.v1` (115 rpcs across 13 services)

```ts
quark.auth().auth()        // authservice         — 19 rpcs
quark.auth().users()       // userservice         —  7 rpcs
quark.auth().identity()    // identityservice     —  3 rpcs
quark.auth().mfa()         // mfaservice          —  5 rpcs
quark.auth().passkey()     // passkeyservice      —  7 rpcs
quark.auth().sso()         // ssoservice          —  3 rpcs
quark.auth().oauthserver() // oauthserverservice  —  8 rpcs
quark.auth().admin()       // adminservice        — 28 rpcs
quark.auth().organization()// organizationservice —  8 rpcs
quark.auth().project()     // projectservice      —  8 rpcs
quark.auth().workspace()   // workspaceservice    —  8 rpcs
quark.auth().role()        // roleservice         —  7 rpcs
quark.auth().policy()      // policyservice       —  4 rpcs
```

### `serverclient` — `platform.controlplane.v1.controlplaneservice` (8 rpcs)

```ts
quark.server().controlplane().getserviceregistry({});
quark.server().controlplane().deploy({ versionid: 'v1.2.3', workflowid: 'wf-deploy' });
quark.server().controlplane().rollback({ deploymentid: 'dpl-123' });
quark.server().controlplane().getdeployment({ id: 'dpl-123' });
quark.server().controlplane().listdeployments({ query: { page: 1, pagesize: 20 } });
quark.server().controlplane().provisiontenant({ orgname: 'acme', orgslug: 'acme' });
quark.server().controlplane().listtenants({ query: { page: 1, pagesize: 20 } });
quark.server().controlplane().getsystemhealth({});
```

### `nodeclient` — `quark.node.v1.nodeservice` (7 rpcs)

```ts
quark.node().node().execute({ nodeuri: '…', input: {}, deadlinems: 5000 });
quark.node().node().cancel({ requestid: 'req-123', reason: 'user-aborted' });
quark.node().node().health({});
quark.node().node().ready({});
quark.node().node().status({});
quark.node().node().drain({ timeoutms: 30_000 });
quark.node().node().shutdown({ force: false });
```

### `workflowclient` — `platform.workflow.v1.workflowservice` (9 rpcs)

```ts
quark.workflow().workflow().createworkflow({ name: 'wf-deploy' });
quark.workflow().workflow().getworkflow({ id: 'wf-1' });
quark.workflow().workflow().listworkflows({ query: { page: 1, pagesize: 20 } });
quark.workflow().workflow().updateworkflow({ id: 'wf-1', name: 'wf-deploy-v2' });
quark.workflow().workflow().deleteworkflow({ id: 'wf-1' });
quark.workflow().workflow().startrun({ workflowid: 'wf-1' });
quark.workflow().workflow().getrun({ id: 'run-1' });
quark.workflow().workflow().cancelrun({ id: 'run-1' });
quark.workflow().workflow().listruns({ query: { page: 1, pagesize: 20 }, workflowid: 'wf-1' });
```

## errors

all errors thrown by the sdk extend `quarkerror` with a stable `code` string.

| class                    | `code`                | when                                                                  |
|--------------------------|-----------------------|-----------------------------------------------------------------------|
| `unauthenticatederror`   | `unauthenticated`     | grpc code 16 — request lacks valid credentials                        |
| `notfounderror`          | `not_found`           | grpc code 5 — entity not found                                        |
| `permissiondeniederror`  | `permission_denied`   | grpc code 7 — caller authenticated but not authorised                 |
| `alreadyexistserror`     | `already_exists`      | grpc code 6 — entity already exists                                   |
| `unavailableerror`       | `unavailable`         | grpc code 14 — service temporarily unavailable; retry with backoff    |
| `deadlineexceedederror`  | `deadline_exceeded`   | grpc code 4 — rpc exceeded its deadline (also caller aborts)          |
| `invalidargumenterror`   | `invalid_argument`    | grpc code 3 — malformed request                                       |
| `connectionerror`        | `connection_error`    | transport failure (dns, tls, connection refused, network reset, …)    |
| `quarkerror`             | `unknown` (or other)  | any other grpc code or unknown cause                                  |

## repository layout

```
quark-js/
├── src/
│   ├── index.ts                  # public api barrel
│   ├── errors.ts                 # quarkerror + 8 subclasses + fromconnecterror
│   ├── transport.ts              # internal: quarktransport, connect-json unary
│   ├── client.ts                 # quarkclient facade
│   ├── client-builder.ts         # quarkclientbuilder fluent builder
│   └── services/
│       ├── auth.ts               # authclient + 13 service classes (115 rpcs)
│       ├── server.ts             # serverclient + controlplaneservice (8 rpcs)
│       ├── node.ts               # nodeclient + nodeservice (7 rpcs)
│       └── workflow.ts           # workflowclient + workflowservice (9 rpcs)
├── package.json
├── tsconfig.json
├── agENTS.md
├── license
└── readme.md
```

## development

```bash
npm install
npm run typecheck    # tsc --noemit — must pass with zero errors
```

there is no build step and no `dist/`. the package ships source typescript
directly.
