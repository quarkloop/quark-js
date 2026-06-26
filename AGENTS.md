# Agent Guide

This is the Quark JS SDK — a TypeScript client library for the Quark runtime. Your job is to make focused, tested changes that preserve the public API and keep the package ESM-only with no build step.

## Repository

- **Name**: Quark JS SDK
- **Language**: TypeScript (ESM-only, no build step)
- **License**: MIT
- **Repo**: [github.com/quarkloop/quark-js](https://github.com/quarkloop/quark-js)
- **Guidelines**: [quarkloop/guidelines](https://github.com/quarkloop/guidelines)

## Quick reference

```bash
# Install dependencies
bun install

# Type-check (must pass with zero errors)
bun run typecheck

# Run the E2E test (requires NATS + Quark runtime running)
cd ../quark && make test-e2e
```

There is no unit test suite yet — the E2E test in the Quark runtime repo is the source of truth. If you add a feature, add an E2E fixture there and verify it passes.

Focused commands for debugging:

```bash
# Check the package can be imported by a consumer
bun run -e "import { createClient } from './src/index.ts'; console.log(typeof createClient)"

# Verify the public API surface (what's exported from index.ts)
bun run -e "import * as api from './src/index.ts'; console.log(Object.keys(api).sort())"

# Check that no internal classes leaked into the public API
grep -E "export.*Impl|export.*Connection" src/index.ts
# (should return nothing — only interfaces and factories are exported)
```

## Structure

```
quark-js/
├── src/
│   ├── index.ts          # public API barrel exports — the package entry point
│   ├── types.ts          # all interfaces and wire-protocol types (no implementation)
│   ├── errors.ts         # QuarkError base + 5 subclasses (all with `code` field)
│   ├── connection.ts     # NATS connection management (connect, request, close)
│   ├── client.ts         # QuarkClientImpl — application-level client
│   ├── admin-client.ts   # QuarkAdminClientImpl — admin-level client
│   ├── client-factory.ts # createClient() — constructs + connects a QuarkClient
│   ├── admin-factory.ts  # createAdminClient() — constructs + connects admin client
│   ├── node-handle.ts    # NodeHandleImpl — per-node execution with validators
│   └── pipeline.ts       # PipelineBuilderImpl — chained node execution
├── docs/
│   ├── architecture.mdx  # source layout, transport layer, design rationale
│   ├── api.mdx           # full API reference (every type, function, error)
│   └── build.mdx         # dev setup, type-checking, E2E test instructions
├── package.json          # ESM ("type": "module"), ships source TS directly
├── tsconfig.json         # strict mode, allowImportingTsExtensions, noEmit
└── README.md
```

One responsibility per file. No god objects, no circular dependencies. The dependency graph is strictly acyclic:

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

Internal implementation classes (`QuarkClientImpl`, `QuarkAdminClientImpl`, `Connection`, `NodeHandleImpl`, `PipelineBuilderImpl`) are NOT exported from `index.ts`. Consumers depend on the interfaces, not the concrete classes.

## Rules

### API stability

1. Do not break the public API without an explicit major version bump.
2. Do not change error codes — they are part of the wire protocol.
3. Do not remove or rename exported types from `index.ts` without a major version bump.
4. Do not change the signature of `createClient()` or `createAdminClient()` — they are the primary entry points.
5. Methods marked "Planned" (currently throwing `NotImplementedError`) must keep their signatures stable — only the implementation changes when the runtime catches up.

### Code style

6. Do not disable TypeScript strict mode for individual files.
7. Do not use `require()` — this is an ESM-only package.
8. Do not add a build step — the package ships source TypeScript directly. Bun and modern bundlers consume it natively.
9. Do not create a `dist/` directory — the `files` field in `package.json` ships `src/` only.
10. One responsibility per file — if a file grows past 150 lines, split it.
11. No circular dependencies — the current source layout is acyclic; keep it that way.
12. Comments explain **why**, not **what**. The code already says what; comments explain the reasoning behind non-obvious decisions.
13. Do not add `// TODO` comments without an accompanying issue link.

### Dependencies

14. Do not add new top-level dependencies without discussing in an issue first.
15. Do not bump `@nats-io/transport-node` to a new major version without testing the E2E suite.
16. Do not depend on the deprecated `nats` package — use `@nats-io/transport-node` v3.

### Testing

17. Every new function needs a unit test (once a test suite exists — until then, add E2E fixtures).
18. Every bug fix needs a regression test.
19. Run `bun run typecheck` before every commit — it must pass with zero errors.
20. The E2E test cross-validates that v1 file-path, v2 buffer, Rust wasm, and Go wasm produce identical output — do not break this invariant.

## Boundaries

This is a single-package repo with no internal module boundaries. The only boundary is between **public API** (exported from `index.ts`) and **internal implementation** (everything else).

- **Public API**: `createClient`, `createAdminClient`, `QuarkClient`, `QuarkAdminClient`, `NodeHandle`, `PipelineBuilder`, all types from `types.ts`, all errors from `errors.ts`.
- **Internal**: `QuarkClientImpl`, `QuarkAdminClientImpl`, `Connection`, `NodeHandleImpl`, `PipelineBuilderImpl`.

Consumers must never import from internal files. The `exports` field in `package.json` enforces this — only `.` (the root) is exported.

## Commit conventions

- Format: `type(scope): short summary`
- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `build`
- Scopes: `types`, `errors`, `connection`, `client`, `admin-client`, `node-handle`, `pipeline`, `index`, `readme`, `agents`
- One scope per commit — do not mix unrelated changes.
- Inspect staged files before every commit: `git diff --cached --stat`
- Never stage: `.env`, `node_modules/`, `dist/`, `*.tsbuildinfo`, `bun.lock`, editor configs.
- Do not include `Co-authored-by` trailers.
- Do not use destructive git commands unless explicitly requested.
- Examples:
  - `feat(client): add streaming support for batch calls`
  - `fix(pipeline): preserve step output when partialInput is null`
  - `docs(readme): add Deno install instructions`

## Testing

- **Type-check**: `bun run typecheck` — runs `tsc --noEmit`. Must pass with zero errors.
- **E2E**: The E2E test lives in the [Quark runtime repo](https://github.com/quarkloop/quark) under `test-project/`. It depends on this package via a `file:` link. Run it from the runtime repo: `make test-e2e`.
- **No unit test suite yet** (planned). When adding a unit test suite, place tests alongside source files: `src/client.test.ts`, `src/pipeline.test.ts`, etc.
- Tests must not mock the NATS connection — use a real NATS server (the E2E test starts one).
- Tests must not hardcode node URIs — use the test nodes from the runtime repo.

## When you're stuck

- Read `docs/architecture.mdx` for design rationale (why `NodeHandle`, why shallow-merge, why `NotImplementedError`).
- Read `docs/api.mdx` for the full API reference.
- Read the [AGENTS.md spec](https://github.com/quarkloop/guidelines/blob/main/agents/SPEC.md) for org-wide conventions.
- Search existing issues and PRs before asking.
- If unsure about a public API change, open an issue and ask before implementing.

## Wire protocol

This SDK talks to the Quark runtime over NATS. The wire protocol is documented in the [Quark runtime's protocol docs](https://github.com/quarkloop/quark/blob/main/docs/protocol.mdx). Key subjects:

| Subject | Direction | Purpose |
|---|---|---|
| `quark.node.<uri>.execute` | request-reply | Execute a node by URI |
| `quark.catalog.list` | request-reply | List all nodes (optional prefix filter) |
| `quark.catalog.search` | request-reply | Search by keyword in URI or description |
| `quark.catalog.info` | request-reply | Get metadata for a single node (exact URI match) |
| `quark.runtime.health` | request-reply | Liveness check |
| `quark.runtime.status` | request-reply | Runtime ID, mode, loaded nodes, uptime |

Do not invent new NATS subjects. If the runtime doesn't subscribe to a subject, the client request will hang until timeout. The `NotImplementedError` pattern exists specifically to prevent this — methods that target unimplemented subjects throw synchronously instead of firing a NATS request into the void.

## Relationship with the Quark runtime repo

This SDK is useless without a running Quark runtime. The runtime lives at [github.com/quarkloop/quark](https://github.com/quarkloop/quark). Key points:

- The E2E test in the runtime repo's `test-project/` depends on this package via a `file:` link (`file:../../quark-js` in `package.json`).
- When you change the SDK, the E2E test in the runtime repo is the verification gate.
- The wire protocol is owned by the runtime repo, not this repo. If the runtime changes a subject or response shape, this SDK must adapt — not the other way around.
- The `HealthStatus.version` field reflects the runtime's version, not the SDK's version. Do not hardcode it.

## Common mistakes to avoid

1. **Firing NATS requests for unimplemented methods.** If a method throws `NotImplementedError`, it must throw synchronously — do not change it to fire a NATS request that will hang.

2. **Deep-merging in PipelineBuilder.** The merge is intentionally shallow. `{ ...prevOutput, ...partialInput }` is correct. Deep-merge would surprise callers who expect nested objects to be replaced, not merged.

3. **Exporting implementation classes.** `QuarkClientImpl`, `QuarkAdminClientImpl`, `Connection`, `NodeHandleImpl`, `PipelineBuilderImpl` are internal. Consumers depend on the interfaces. If you need to export a new type, add it to `index.ts` as a type-only export.

4. **Adding a build step.** The package ships source TypeScript. Do not add `tsc` to the build pipeline, do not create a `dist/` directory, do not add `prepublishOnly` scripts. Bun, Deno, and modern bundlers consume `.ts` directly.

5. **Using CommonJS.** `require()`, `module.exports`, `__dirname`, `__filename` — none of these exist in ESM. If you need `__dirname`, use `import.meta.url` with `fileURLToPath`.

6. **Breaking the `tsconfig.json` settings.** `allowImportingTsExtensions: true` and `noEmit: true` are required because source files import each other with `.ts` extensions (Bun-style). Removing either will break the type-check.

7. **Changing the `files` field in `package.json`.** Only `src/`, `README.md`, and `LICENSE` are published. Do not add `docs/`, `test/`, or config files to the published package.

8. **Ignoring the `requestTimeout`.** The default is 30 seconds. If a node takes longer, the caller gets a `ConnectionError`. Do not set the timeout to 0 (infinite) — a hanging node should fail, not hang forever.

9. **Not draining the NATS connection.** `close()` calls `nc.drain()` before closing. If you bypass `close()` and call `nc.close()` directly, pending publishes may be lost. Always use `close()`.

10. **Mixing `input` and `partialInput` semantics in pipelines.** The first step receives `input` verbatim. Subsequent steps receive `{ ...prevOutput, ...partialInput }`. Do not change this — it's the documented behavior and callers depend on it.

11. **Forgetting to update `CHANGELOG.md`.** Every user-facing change must be documented under `[Unreleased]` before merging.
