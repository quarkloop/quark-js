# Build & development

How to set up a local development environment for `@quarkloop/quark-js`, run type-checks, and run the E2E test suite.

For the public API, see [API.md](./API.md). For architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Prerequisites

- [Bun](https://bun.sh/) ≥ 1.0 (for running TypeScript directly)
- Node.js ≥ 20 (for `tsc` type-checking)
- A running [NATS server](https://nats.io/download-nats-io/) for integration testing
- The [Quark runtime](https://github.com/quarkloop/quark) if you want to run the E2E test

## Install dependencies

```bash
git clone https://github.com/quarkloop/quark-js.git
cd quark-js
bun install
```

## Type-check

```bash
bun run typecheck
```

This runs `tsc --noEmit`. It should complete with no errors. The `tsconfig.json` is configured with `strict: true`, `allowImportingTsExtensions: true`, and `noEmit: true` — source files import each other with explicit `.ts` extensions (Bun-style) which requires these compiler options.

## Run the E2E test

The E2E test lives in the [Quark runtime repo](https://github.com/quarkloop/quark) under `quark-server/test-project/`. It depends on this package via a `file:` link.

To run it:

1. Clone the runtime repo as a sibling directory:

   ```bash
   git clone https://github.com/quarkloop/quark.git ../quark
   ```

2. Follow the Quark repo's build instructions to build the runtime and test nodes.

3. From the Quark repo: `make test-e2e`.

The E2E test exercises every implemented API surface: connect, run, batch, pipeline, list, search, info, health, status. It also cross-validates that `.so`, Rust `.wasm`, and Go `.wasm` node execution paths produce identical output for the same input.

## Source layout

See [ARCHITECTURE.md](./ARCHITECTURE.md#source-layout) for the `src/` directory layout and the dependency graph between modules.

## Publishing (maintainers only)

This package currently ships source TypeScript directly — there is no compiled `dist/` step. To publish to npm:

```bash
# 1. Bump version in package.json
# 2. Update CHANGELOG.md
# 3. Commit and tag
git commit -am "chore: bump to 0.1.1"
git tag v0.1.1
git push --follow-tags

# 4. Publish
npm publish --access public
```

The `files` field in `package.json` controls what gets published: only `src/`, `README.md`, and `LICENSE` are included. No `node_modules`, no `bun.lock`, no test fixtures.

## Continuous integration (planned)

A GitHub Actions workflow will be added once the package is published to npm. It will run `bun run typecheck` on every push and PR. Integration tests against a real Quark runtime will run on tagged releases.
