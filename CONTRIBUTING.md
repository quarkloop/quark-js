# Contributing to @quarkloop/quark-js

Thanks for your interest in contributing! This document describes how to set up a development environment and submit changes.

## Development setup

### Prerequisites

- [Bun](https://bun.sh/) ≥ 1.0
- Node.js ≥ 20 (for `tsc` type-checking)
- A running [NATS server](https://nats.io/download-nats-io/) for integration testing
- The [Quark Runtime](https://github.com/quarkloop/poc-rust-runtime) if you want to run the E2E test

### Install dependencies

```bash
git clone https://github.com/quarkloop/quark-js.git
cd quark-js
bun install
```

### Type-check

```bash
bun run typecheck
```

This runs `tsc --noEmit`. It should complete with no errors.

### Run the E2E test against a runtime

The E2E test lives in the [runtime repo](https://github.com/quarkloop/poc-rust-runtime) under `test-project/`. It depends on this package via a `file:` link. To run it:

1. Clone the runtime repo as a sibling directory:
   ```bash
   git clone https://github.com/quarkloop/poc-rust-runtime.git ../poc-rust-runtime
   ```
2. Follow the runtime repo's README to build the runtime and test nodes.
3. From the runtime repo: `make test-e2e`.

## Submitting changes

### Pull requests

1. Fork the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. Make your changes. Keep commits focused — one logical change per commit.
3. Ensure `bun run typecheck` passes.
4. Write a clear PR description explaining what changed and why.
5. Reference any related issues (e.g. `Closes #42`).

### Commit message conventions

We follow a lightweight [Conventional Commits](https://www.conventionalcommits.org/) style:

| Prefix | Use |
|---|---|
| `feat:` | New user-facing feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `chore:` | Tooling, dependencies, configs |
| `refactor:` | Code restructuring with no behavior change |
| `test:` | Test additions or fixes |
| `perf:` | Performance improvement |

Examples:
- `feat(client): add streaming support for batch calls`
- `fix(pipeline): preserve step output when partialInput is null`
- `docs: clarify error handling in README`

### Code style

- **TypeScript strict mode** is enabled. Do not disable it for individual files.
- **ESM only.** Use `import` / `export`, not `require`.
- **One responsibility per file.** Don't add new concerns to existing files — create a new one.
- **No god objects.** If a class grows past ~150 lines, consider splitting it.
- **No circular dependencies.** The current source layout is acyclic; keep it that way.
- **Comments explain why, not what.** The code already says what; comments should explain the reasoning behind non-obvious decisions.

### Tests

There is no unit test suite yet (planned). For now, the E2E test in the runtime repo is the source of truth. If you add a feature, add an E2E fixture there and verify it passes.

## Reporting bugs

File issues at [github.com/quarkloop/quark-js/issues](https://github.com/quarkloop/quark-js/issues). Include:

- Quark JS version (`npm ls @quarkloop/quark-js`)
- Runtime version (`admin.health()` returns the version)
- Bun / Node.js version
- NATS server version
- Minimal reproducer (a 10-line script is ideal)
- Expected vs actual behavior
- Relevant logs with `RUST_LOG=debug` on the runtime side

## Reporting security vulnerabilities

See [SECURITY.md](./SECURITY.md).

## Code of conduct

By participating in this project you agree to abide by the [Code of Conduct](./CODE_OF_CONDUCT.md).
