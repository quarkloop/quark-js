# Quark JS SDK

TypeScript SDK for [Quark](https://github.com/quarkloop/quark) — execute nodes by URI, chain them in pipelines, browse the catalog, and monitor runtime health from your TypeScript application.

Think of it as the Supabase JS SDK, but for nodes: your Quark deployment hosts small functions written in Rust, Go, Java, or any language that compiles to a shared library (`.so`) or WebAssembly (`.wasm`), and this SDK lets your TypeScript application call them.

## Installation

### npm

```bash
npm install @quarkloop/quark-js
```

### Bun

```bash
bun add @quarkloop/quark-js
```

### Deno

Add the package to your `deno.json` imports:

```json
{
  "imports": {
    "@quarkloop/quark-js": "npm:@quarkloop/quark-js@^0.1.0"
  }
}
```

Then import as usual:

```typescript
import { createClient } from '@quarkloop/quark-js';
```

> This package ships source TypeScript directly — no compiled `dist/` step required. It works out of the box with Bun and Deno. For Node.js, use a TypeScript-aware loader (tsx, ts-node, or compile with `tsc`).

## Quick start

```typescript
import { createClient, createAdminClient } from '@quarkloop/quark-js';

const quark = await createClient({
  servers: ['localhost:4222'],
  // timeout: 5000,            // connection timeout (ms)
  // requestTimeout: 30000,    // per-request timeout (ms)
});

// Execute a node by URI:
const result = await quark.run('myorg/myteam/validate:v1', {
  servers: [{ host: 'web-01', port: 443, protocol: 'https' }],
});

// Pipeline: feed output of one node into the next:
const manifest = await quark
  .pipeline('myorg/myteam/validate:v1', serverConfig)
  .then('myorg/myteam/manifest:v1', { servers: serverConfig.servers })
  .execute();

// Batch (runs in parallel):
const [a, b, c] = await quark.batch([
  ['myorg/myteam/validate:v1', serverConfig],
  ['myorg/myteam/validate-wasm:v1', serverConfig],
  ['myorg/myteam/validate-go:v1', serverConfig],
]);

// Catalog browsing:
const all = await quark.list();
const matches = await quark.search('validate');

// Admin operations (health + status):
const admin = await createAdminClient({ servers: ['localhost:4222'] });
await admin.health();   // -> { status: 'ok', version: '0.3.0' }
await admin.status();   // -> { runtimeId, mode, loadedNodes, uptime }

await quark.close();
await admin.close();
```

## API reference

### `createClient(opts): Promise<QuarkClient>`

Creates and connects a client. `opts.servers` is required.

| Option | Type | Default | Description |
|---|---|---|---|
| `servers` | `string[]` | — | Quark server URLs (required) |
| `timeout` | `number` | `5000` | Connection timeout (ms) |
| `requestTimeout` | `number` | `30000` | Per-request timeout (ms) |

### `createAdminClient(opts): Promise<QuarkAdminClient>`

Creates and connects an admin client. Same options shape as `createClient`.

### `QuarkClient`

| Method | Signature | Status |
|---|---|---|
| `node(uri)` | `(uri: string) => NodeHandle` | Implemented |
| `run(uri, input)` | `(uri, input) => Promise<unknown>` | Implemented (shorthand for `node(uri).run(input)`) |
| `batch(calls)` | `(calls: [uri, input][]) => Promise<unknown[]>` | Implemented (parallel via `Promise.all`) |
| `pipeline(uri, input)` | `(uri, input) => PipelineBuilder` | Implemented |
| `list(prefix?)` | `(prefix?: string) => Promise<NodeInfo[]>` | Implemented |
| `search(keyword)` | `(keyword: string) => Promise<NodeInfo[]>` | Implemented |
| `pull(uri)` | — | Planned — currently throws `NotImplementedError` |
| `close()` | `() => Promise<void>` | Implemented |

### `QuarkAdminClient`

| Method | Status |
|---|---|
| `push(uri, pkg)` | Planned — currently throws `NotImplementedError` |
| `delete(uri)` | Planned — currently throws `NotImplementedError` |
| `list(prefix?)` | Implemented |
| `search(keyword)` | Implemented |
| `info(uri)` | Implemented |
| `pull(uri)` | Planned — currently throws `NotImplementedError` |
| `health()` | Implemented |
| `status()` | Implemented |
| `flushCache(uri?)` | Planned — currently throws `NotImplementedError` |
| `close()` | Implemented |

Methods marked "Planned" exist in the type system for forward compatibility. Calling them throws `NotImplementedError` synchronously — no request is fired.

### `NodeHandle`

```typescript
const handle = quark.node('myorg/myteam/validate:v1');
await handle.run(input);                    // -> output
await handle.info();                        // -> NodeInfo
handle.validate(inputCheck, outputCheck);   // returns a new handle with validators attached
```

`validate()` takes optional input/output validators. They run before/after the request. A validator that throws aborts the call.

### `PipelineBuilder`

```typescript
await quark
  .pipeline('uri1', input1)            // first step: input1 verbatim
  .then('uri2', { extra: 'merged' })   // second step: {...prevOutput, ...partialInput}
  .then('uri3')                        // third step: prevOutput verbatim
  .execute();
```

For steps after the first, if both the previous output and the step's `partialInput` are objects, they're shallow-merged (`partialInput` wins on key conflict). Otherwise `partialInput` (if provided) replaces the input entirely.

### Errors

All errors thrown by this SDK extend `QuarkError` with a `code` field:

| Class | `code` | Thrown by |
|---|---|---|
| `NodeExecutionError` | `NODE_EXECUTION_ERROR` | `node.run`, `pipeline.execute` when the runtime returns `success: false` |
| `ValidationError` | `VALIDATION_ERROR` | `node.validate` validators |
| `CatalogError` | `CATALOG_ERROR` | Reserved for future catalog operations |
| `ConnectionError` | `CONNECTION_ERROR` | `Connection.request` when a call fails or times out |
| `NotImplementedError` | `NOT_IMPLEMENTED` | `pull`, `push`, `delete`, `flushCache` |

```typescript
import { NodeExecutionError, NotImplementedError } from '@quarkloop/quark-js';

try {
  await quark.run('myorg/myteam/validate:v1', input);
} catch (err) {
  if (err instanceof NodeExecutionError) {
    console.error(`Node failed: ${err.message} (code: ${err.code})`);
  } else if (err instanceof NotImplementedError) {
    console.error(`Method not yet implemented: ${err.message}`);
  } else {
    throw err;  // unexpected
  }
}
```

## Compatibility

| Runtime | Supported |
|---|---|
| Bun | ≥ 1.0 |
| Node.js | ≥ 20 (with a TypeScript loader) |
| Deno | ≥ 1.30 |

This SDK uses ESM (`"type": "module"`) and TypeScript 5.7+ syntax features.

## Versioning

This package follows [Semantic Versioning](https://semver.org/). Pre-1.0 minor bumps may include wire-protocol changes; pin to `0.1.x` if you need stability.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
