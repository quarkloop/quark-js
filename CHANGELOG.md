# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- `pull(uri)` — download a node package from the catalog (awaits runtime support for `quark.catalog.pull`).
- `push(uri, pkg)` — upload a node package to the catalog (awaits runtime support for `quark.catalog.push`).
- `delete(uri)` — remove a node from the catalog (awaits runtime support for `quark.catalog.delete`).
- `flushCache(uri?)` — evict cached node modules (awaits runtime support for `quark.runtime.cache.flush`).
- Streaming execution via `NodeEntry.stream` (no runtime support yet).

## [0.1.0] — 2026-06-26

### Added

- **`createClient(opts)`** — construct and connect a `QuarkClient` to a NATS server.
- **`createAdminClient(opts)`** — construct and connect a `QuarkAdminClient` for admin operations.
- **`QuarkClient`** API surface:
  - `node(uri)` — get a `NodeHandle` for per-node operations.
  - `run(uri, input)` — shorthand for `node(uri).run(input)`.
  - `batch(calls)` — execute multiple nodes in parallel via `Promise.all`.
  - `pipeline(uri, input)` — start a `PipelineBuilder` chain.
  - `list(prefix?)` — browse the catalog (optional URI prefix filter).
  - `search(keyword)` — search catalog by URI or description substring.
  - `close()` — drain the NATS connection.
- **`QuarkAdminClient`** API surface:
  - `list/search/info` — catalog browsing (mirrors `QuarkClient`).
  - `health()` — runtime liveness check.
  - `status()` — runtime ID, mode, loaded nodes, uptime.
  - `close()` — drain the NATS connection.
- **`NodeHandle`** with `run()`, `info()`, and `validate()` for attaching input/output validators.
- **`PipelineBuilder`** with `then()` for chaining and `execute()` for running the chain. Subsequent steps shallow-merge their `partialInput` with the previous step's output.
- **Error hierarchy** rooted at `QuarkError` with a `code` field:
  - `NodeExecutionError` (`NODE_EXECUTION_ERROR`)
  - `ValidationError` (`VALIDATION_ERROR`)
  - `CatalogError` (`CATALOG_ERROR`) — reserved for future catalog operations.
  - `ConnectionError` (`CONNECTION_ERROR`)
  - `NotImplementedError` (`NOT_IMPLEMENTED`) — thrown synchronously by `pull`, `push`, `delete`, `flushCache` until the runtime implements the corresponding NATS subjects.
- **NATS dependency** on `@nats-io/transport-node` v3 — the official NATS client, not the deprecated `nats` package.
- **Source TypeScript distribution** — no build step required for Bun; modern bundlers and `tsc` can consume directly.
- **TypeScript strict mode**, ESM-only, no circular dependencies.

### Known limitations

- `pull`, `push`, `delete`, `flushCache` throw `NotImplementedError` — the runtime has not yet implemented the corresponding NATS subjects.
- No unit test suite (planned).
- No streaming execution support (planned).
- Deno compatibility is not yet verified.
