# Security Policy

## Supported versions

This project is in early development (pre-1.0). Only the latest `main` branch receives security fixes. Once a 1.0 release is cut, we'll publish a support table here.

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a vulnerability

**Do NOT file a public GitHub issue for security vulnerabilities.**

Instead, email **reza.ebrahimi.dev@gmail.com** with:

1. A description of the vulnerability and its impact.
2. Steps to reproduce (a minimal PoC is ideal).
3. Affected versions (run `npm ls @quarkloop/quark-js`).
4. Any suggested fixes or mitigations.

You should receive an acknowledgment within 48 hours. If you don't, please follow up to confirm we received the original report — email can get filtered.

We will coordinate disclosure with you and credit your report in the release notes unless you prefer to remain anonymous.

## Disclosure timeline

1. **Day 0**: We receive the report and confirm receipt within 48 hours.
2. **Day 0–7**: We reproduce the issue and assess severity.
3. **Day 7–30**: A fix is developed on a private branch.
4. **Day 30**: The fix is released and the vulnerability is disclosed publicly with credit to the reporter (unless anonymity is requested).

Critical vulnerabilities may be fixed and disclosed faster. Lower-severity issues may sit longer if a fix would require a breaking change.

## Scope

This security policy applies to the `@quarkloop/quark-js` TypeScript client library. Vulnerabilities in dependencies should be reported to the upstream project. Vulnerabilities in the [Quark Runtime](https://github.com/quarkloop/poc-rust-runtime) should be reported through that project's security policy.

### In scope

- Memory safety issues in the client code (TypeScript / JavaScript).
- Authentication or authorization bypass when connecting to NATS.
- Deserialization vulnerabilities in the wire-protocol parsing.
- ReDoS or other denial-of-service vectors in regexes or JSON parsing.
- Supply-chain risks (compromised dependencies, malicious publish artifacts).

### Out of scope

- Vulnerabilities in the Quark Runtime (Rust) — report to that project.
- Vulnerabilities in NATS server itself — report to [nats-io/nats-server](https://github.com/nats-io/nats-server).
- Vulnerabilities in the Node.js / Bun runtime or standard library.
- Social engineering attacks against maintainers or users.
- Theoretical timing attacks without a demonstrated exploit.

## Hardening recommendations

When deploying `@quarkloop/quark-js` in production:

1. **Use TLS for NATS connections.** Plain `nats://` is fine for development; use `tls://` or `wss://` for any deployment that crosses a trust boundary.
2. **Set per-request timeouts.** The default is 30s. Lower it to whatever your application can tolerate.
3. **Validate node inputs and outputs at the call site.** Use `NodeHandle.validate()` to attach input/output validators — don't trust the runtime to enforce your schema.
4. **Catch `QuarkError` at the boundary.** All library errors extend `QuarkError`. Don't let them propagate to the user as unstructured 500s.
5. **Pin the package version.** Until 1.0 ships, minor bumps may include wire-protocol changes. Pin to `0.1.x` in your `package.json` if stability matters.
