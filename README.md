# Quark JS SDK

TypeScript SDK for [Quark](https://github.com/quarkloop/quark) — execute nodes by URI, chain them in pipelines, browse the catalog, and monitor runtime health from your TypeScript application.

## Overview

The Quark JS SDK is the primary way for TypeScript applications to talk to a Quark deployment. Quark hosts small functions ("nodes") written in Rust, Go, Java, or any language that compiles to a shared library (`.so`) or WebAssembly (`.wasm`). This SDK lets your application call them over the network — think of it as the Supabase JS SDK, but for nodes.

## Features

- **Node execution** — run any node by URI with a single `await quark.run(uri, input)` call
- **Pipelines** — chain node calls where each step's output feeds the next step's input
- **Batch execution** — run multiple nodes in parallel with `Promise.all` semantics
- **Catalog browsing** — list, search, and inspect nodes registered with the runtime
- **Admin operations** — health checks, runtime status, and (planned) push/delete/pull/flushCache
- **Typed errors** — every error extends `QuarkError` with a `code` field for programmatic handling
- **Validator hooks** — attach input/output validators to `NodeHandle` for runtime schema enforcement
- **ESM-first** — ships source TypeScript, works natively with Bun and Deno, no build step required

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

Add to your `deno.json` imports:

```json
{
  "imports": {
    "@quarkloop/quark-js": "npm:@quarkloop/quark-js@^0.1.0"
  }
}
```

## Quick start

```typescript
import { createClient, createAdminClient } from '@quarkloop/quark-js';

const quark = await createClient({
  servers: ['localhost:4222'],
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

// Admin operations:
const admin = await createAdminClient({ servers: ['localhost:4222'] });
await admin.health();   // -> { status: 'ok', version: '0.3.0' }
await admin.status();   // -> { runtimeId, mode, loadedNodes, uptime }

await quark.close();
await admin.close();
```

## Documentation

- [Architecture](./docs/architecture.mdx) — source layout, transport layer, and design rationale
- [API reference](./docs/api.mdx) — every public type, function, and error class
- [Build & development](./docs/build.mdx) — local setup, type-checking, and testing
- [Changelog](./CHANGELOG.md) — release history
- [Contributing](./CONTRIBUTING.md) — development setup, PR workflow, code style

## Compatibility

| Runtime | Supported |
|---|---|
| Bun | ≥ 1.0 |
| Node.js | ≥ 20 (with a TypeScript loader) |
| Deno | ≥ 1.30 |

This SDK uses ESM (`"type": "module"`) and TypeScript 5.7+ syntax features.

## Contributing

Pull requests are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, commit message conventions, and code style rules. By participating you agree to abide by the [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
