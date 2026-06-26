# Architecture

This document describes the internal architecture of `@quarkloop/quark-js` — the source layout, the transport layer, and the design rationale behind the API surface.

For the public API reference, see [API.md](./API.md). For build and development, see [BUILD.md](./BUILD.md).

## Source layout

```
src/
├── index.ts          # Public exports — the package entry point
├── types.ts          # All interfaces and wire-protocol types
├── errors.ts         # QuarkError + subclasses
├── connection.ts     # Transport layer (NATS connection, request-reply)
├── client.ts         # QuarkClient implementation
├── admin-client.ts   # QuarkAdminClient implementation
├── client-factory.ts # createClient()
├── admin-factory.ts  # createAdminClient()
├── node-handle.ts    # NodeHandle implementation
└── pipeline.ts       # PipelineBuilder implementation
```

**One responsibility per file.** No god objects, no circular dependencies. The dependency graph is strictly acyclic:

```
index.ts
  ↓
client-factory.ts ──► client.ts ──► node-handle.ts ──► connection.ts
admin-factory.ts  ──► admin-client.ts ──► pipeline.ts ──► connection.ts
                                              ↓
                                          errors.ts
                                              ↓
                                          types.ts
```

Internal implementation classes (`QuarkClientImpl`, `QuarkAdminClientImpl`, `Connection`, `NodeHandleImpl`, `PipelineBuilderImpl`) are intentionally NOT exported from `index.ts`. Consumers depend on the interfaces (`QuarkClient`, `QuarkAdminClient`, `NodeHandle`, `PipelineBuilder`), not the concrete classes.

## Transport layer

The SDK communicates with a Quark runtime deployment over NATS, using request-reply semantics. The transport is encapsulated in `Connection`:

- `connect()` — establish a NATS connection with configurable timeout
- `close()` — drain pending publishes and close the connection
- `request<T>(subject, payload)` — typed JSON request-reply over a NATS subject
- `publishWithReply(subject, replyTo, payload)` — fire-and-forget publish with a reply-to inbox (reserved for future streaming operations)
- `subscribe(subject)` — expose the underlying NATS subscription as an async iterable

All public methods serialize payloads as JSON strings. The underlying NATS client handles framing, reconnection, and timeouts.

## NATS dependency

This package depends on `@nats-io/transport-node` v3 — the official NATS client. It does **not** depend on the deprecated `nats` package.

The v3 client is smaller, faster, and actively maintained. It supports Bun, Node.js, and Deno natively.

## Design rationale

### Why a separate `Connection` class?

NATS connection management (connect, drain, reconnect, timeout) is orthogonal to what the SDK does with the connection (execute nodes, browse catalog). Keeping them separate lets us:

- Add new transports (e.g. WebSocket direct, in-process for testing) without touching client code
- Share one connection across multiple `QuarkClient` / `QuarkAdminClient` instances (future optimization)
- Test client logic with a mock `Connection`

### Why `NodeHandle` instead of just `run(uri, input)`?

`quark.run(uri, input)` is the shorthand. `quark.node(uri)` returns a `NodeHandle` that lets you:

- Call `info()` to fetch metadata about the node without executing it
- Attach `validate()` hooks that run before/after every `run()` call
- Pass the handle to other code that doesn't need to know the URI

This is useful when you have a node you call repeatedly with different inputs, or when you want to enforce input/output schemas at the call site.

### Why does `PipelineBuilder` shallow-merge instead of deep-merge?

Pipeline steps often look like:

```typescript
quark
  .pipeline('validate:v1', serverConfig)
  .then('generate-manifest:v1', { servers: serverConfig.servers })
  .execute();
```

The second step needs the validation output AND the original `servers` array (validation produces `{ valid, errors, warnings }` but doesn't echo back the servers). Shallow-merge handles this case correctly: `{ ...validateOutput, ...{ servers } }` gives the manifest generator both.

Deep-merge would be surprising here — it would merge nested objects (e.g. `summary.activeServers`) in ways the caller didn't ask for. If you need deep-merge, do it yourself before calling `.then()`.

### Why do `pull`, `push`, `delete`, `flushCache` throw `NotImplementedError`?

These methods are declared on the `QuarkClient` and `QuarkAdminClient` interfaces for forward compatibility — the type system should reflect the eventual API surface. But the runtime has not yet implemented the corresponding NATS subjects.

Throwing synchronously (rather than firing a NATS request that would hang until timeout) gives consumers a clear, immediate signal. Once the runtime implements a subject, the client method body changes from `throw new NotImplementedError(...)` to `await this.conn.request(...)` with no breaking API change.

### Why ESM-only?

CommonJS is in maintenance mode for new TypeScript libraries. ESM is the standard going forward, supported natively by Bun and Deno. Node.js ≥ 20 supports ESM without configuration.

If you need CommonJS, use a transpiler (esbuild, swc, tsc with `module: commonjs`) to convert the source. The source itself stays ESM.

### Why no compiled `dist/`?

Shipping source TypeScript means:

- Bun and Deno can consume it directly with no build step
- Modern bundlers (esbuild, Vite, webpack 5) can consume it directly
- The package is smaller (no duplicate `dist/` and `src/`)
- Type definitions are always in sync with the implementation

For Node.js users who need CommonJS or want a build step, they can run `tsc` themselves against the included `tsconfig.json`.
