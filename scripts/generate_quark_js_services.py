#!/usr/bin/env python3
"""
generate_quark_js_services.py

Parses the buf-generated *_pb.ts files in quark-js/src/gen/ and emits
fully-typed SDK service wrapper classes in src/services/.

For every service descriptor (e.g. `AuthService` in auth_pb.ts), this
script emits a class of the same name with one typed method per RPC. Each
method delegates to a typed Connect-RPC client created via
`createClient(ServiceDescriptor, transport.underlying)`.

Output files (overwritten in place):
  src/services/auth.ts
  src/services/server.ts
  src/services/node.ts
  src/services/workflow.ts

Usage:
  python3 scripts/generate_quark_js_services.py

Run after `npm run generate` whenever the .proto files in proto/ change.
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Tuple

# Resolve paths relative to this script's location so it works regardless
# of the current working directory.
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
GEN_DIR = REPO_ROOT / "src" / "gen"
OUT_DIR = REPO_ROOT / "src" / "services"


@dataclass
class RpcMethod:
    proto_name: str       # e.g. "Login"
    method_name: str      # e.g. "login" (camelCase)
    input_type: str       # e.g. "LoginRequest" (or "Empty" if input is Empty)
    output_type: str      # e.g. "LoginResponse"
    input_is_empty: bool  # True if input type is Empty


@dataclass
class Service:
    name: str             # e.g. "AuthService"
    descriptor_name: str  # the generated const name (same as name)
    rpcs: List[RpcMethod] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Parser
# ---------------------------------------------------------------------------

# Match a service block: `export const FooService = { ... } as const;`
SERVICE_BLOCK_RE = re.compile(
    r'export const (?P<name>\w+Service) = \{(?P<body>.*?)\} as const;',
    re.DOTALL,
)

# Match a method entry inside a service block. Each method looks like:
#   <key>: {
#     name: "ProtoName",
#     I: InputType,
#     O: OutputType,
#     kind: MethodKind.Unary,
#   },
METHOD_RE = re.compile(
    r'(?P<key>\w+):\s*\{\s*'
    r'name:\s*"(?P<proto_name>\w+)",\s*'
    r'I:\s*(?P<input>\w+),\s*'
    r'O:\s*(?P<output>\w+),\s*'
    r'kind:\s*MethodKind\.Unary,',
    re.DOTALL,
)


def parse_services(pb_file: Path) -> List[Service]:
    """Parse all service descriptors from a v2 *_pb.ts file.

    In @bufbuild/protoc-gen-es v2, service descriptors are emitted directly
    in the *_pb.ts file (not a separate *_connect.ts file). Each looks like:

        export const FooService: GenService<{
          ...
        }> = /*@__PURE__*/
          serviceDesc(file_foo, 0);
    """
    text = pb_file.read_text()
    services: List[Service] = []
    # Match: `export const <Name>Service: GenService<{ ... }> = ... serviceDesc(file_X, N);`
    # We need to extract the methods inside the GenService<{ ... }> block.
    # Use a regex that captures the service name and the body.
    service_re = re.compile(
        r'export const (?P<name>\w+Service): GenService<\{(?P<body>.*?)\}>\s*=\s*',
        re.DOTALL,
    )
    # Match each method entry inside the body:
    #   <key>: {
    #     methodKind: "unary";
    #     input: typeof FooRequestSchema;
    #     output: typeof FooResponseSchema;
    #     ...
    #   },
    method_re = re.compile(
        r'(?P<key>\w+):\s*\{\s*'
        r'methodKind:\s*"unary";\s*'
        r'input:\s*typeof\s+(?P<input>\w+);\s*'
        r'output:\s*typeof\s+(?P<output>\w+);',
        re.DOTALL,
    )
    for m in service_re.finditer(text):
        name = m.group("name")
        body = m.group("body")
        svc = Service(name=name, descriptor_name=name)
        for mm in method_re.finditer(body):
            key = mm.group("key")
            input_schema = mm.group("input")  # e.g. "LoginRequestSchema"
            output_schema = mm.group("output")  # e.g. "LoginResponseSchema"
            # Strip the "Schema" suffix to get the message type name.
            input_type = input_schema[:-6] if input_schema.endswith("Schema") else input_schema
            output_type = output_schema[:-6] if output_schema.endswith("Schema") else output_schema
            # The TS method key in the descriptor is already camelCase.
            method_name = key
            svc.rpcs.append(RpcMethod(
                proto_name=method_name[0].upper() + method_name[1:],  # best-effort PascalCase
                method_name=method_name,
                input_type=input_type,
                output_type=output_type,
                input_is_empty=(input_type == "Empty"),
            ))
        services.append(svc)
    return services


def to_camel(name: str) -> str:
    """PascalCase → camelCase."""
    if not name:
        return name
    return name[0].lower() + name[1:]


# ---------------------------------------------------------------------------
# Code emitters
# ---------------------------------------------------------------------------

HEADER = """\
/**
 * AUTO-GENERATED by /home/z/my-project/scripts/generate_quark_js_services.py.
 *
 * DO NOT EDIT BY HAND. To regenerate, run `npm run generate` (which regens
 * the descriptors in src/gen/) and then run the python script to regenerate
 * this file.
 *
 * Each service class below is a thin wrapper around the typed Connect-RPC
 * client produced by `createClient(<generated descriptor>, transport)`.
 * Every method is fully typed — request shapes come from the generated
 * message types in src/gen/<proto>_pb.ts, and responses are typed the same
 * way. Method names match the proto RPC names (in camelCase) exactly.
 */

"""

COMMON_HEADER = """\
import type { QuarkTransport, QuarkCallOptions } from '../transport.ts';
import { ServiceClient } from '../transport.ts';
import { createClient, type Client } from '@connectrpc/connect';
"""


def emit_method(rpc: RpcMethod) -> str:
    """Emit a single typed method that delegates to the typed Connect client."""
    # For methods with empty input, Connect's client still requires an Empty
    # message — pass `{} as never` to satisfy the type. Actually, looking at
    # MessageInitShape<Empty>, it accepts `{}`. So we pass `{}`.
    if rpc.input_is_empty:
        # Empty input — pass `{}`. Type it as `QuarkCallOptions` only (no request arg).
        return (
            f"  /** `{rpc.proto_name}` — input is `Empty`. */\n"
            f"  {rpc.method_name}(options?: QuarkCallOptions): Promise<{rpc.output_type}> {{\n"
            f"    return this.client.{rpc.method_name}({{}}, options);\n"
            f"  }}"
        )
    # Normal method — typed request argument.
    return (
        f"  /** `{rpc.proto_name}` — request: `{rpc.input_type}`, response: `{rpc.output_type}`. */\n"
        f"  {rpc.method_name}(\n"
        f"    request: {rpc.input_type},\n"
        f"    options?: QuarkCallOptions,\n"
        f"  ): Promise<{rpc.output_type}> {{\n"
        f"    return this.client.{rpc.method_name}(request, options);\n"
        f"  }}"
    )


def emit_service_class(
    svc: Service,
    proto_file_stem: str,
    descriptor_doc: str,
) -> str:
    """Emit a single service wrapper class."""
    methods = "\n\n".join(emit_method(r) for r in svc.rpcs)
    # The generated descriptor is imported as `<name>Desc` to avoid clashing
    # with the SDK wrapper class name (which is `<name>`).
    desc_alias = f"{svc.name}Desc"
    return f"""\
/**
 * `{descriptor_doc}` — {len(svc.rpcs)} RPCs.
 *
 * Wraps the generated `{svc.name}` service descriptor from
 * `src/gen/{proto_file_stem}_connect.ts`. Each method delegates to the
 * typed Connect-RPC client produced by
 * `createClient({desc_alias}, transport.underlying)`.
 */
export class {svc.name} extends ServiceClient {{
  private readonly client: Client<typeof {desc_alias}>;

  constructor(transport: QuarkTransport) {{
    super(transport);
    this.client = createClient({desc_alias}, transport.underlying);
  }}

{methods}
}}
"""


# ---------------------------------------------------------------------------
# Top-level emitters for each output file
# ---------------------------------------------------------------------------

def emit_file(
    output_path: Path,
    imports: List[str],
    services: List[Tuple[Service, str]],  # (service, descriptor_doc)
    proto_file_stems: List[str],
    facade_class_name: str | None,
    facade_base_class: str | None,
    facade_doc: str | None,
    facade_accessors: List[Tuple[str, str, str]] | None = None,
    # accessor tuples: (accessor_method, return_class, descriptor_doc)
) -> None:
    """Emit a complete service file."""
    parts: List[str] = []
    parts.append(HEADER)
    parts.append(COMMON_HEADER)
    for imp in imports:
        parts.append("\n")
        parts.append(imp)
    parts.append("\n")
    # Emit each service class
    for svc, doc in services:
        proto_stem = next(
            stem for stem in proto_file_stems
            if (GEN_DIR / f"{stem}_pb.ts").exists()
            and svc.descriptor_name in (GEN_DIR / f"{stem}_pb.ts").read_text()
        )
        parts.append("\n")
        parts.append(emit_service_class(svc, proto_stem, doc))

    # Emit facade class
    if facade_class_name and facade_base_class:
        accessor_lines: List[str] = []
        if facade_accessors:
            for accessor, ret_class, doc in facade_accessors:
                accessor_lines.append(
                    f"  /** {doc} */\n"
                    f"  {accessor}(): {ret_class} {{\n"
                    f"    return (this._{accessor} ??= new {ret_class}(this.transport));\n"
                    f"  }}"
                )
        private_fields = "\n".join(
            f"  private _{acc}?: {ret};"
            for acc, ret, _ in (facade_accessors or [])
        )
        accessors_block = "\n\n".join(accessor_lines)
        facade = f"""

// ─── {facade_class_name} facade ──────────────────────────────────────────────

/**
 * {facade_doc}
 */
export class {facade_class_name} extends {facade_base_class} {{
{private_fields}

  /** @internal Constructed by {{@link QuarkClientBuilder.build}}. */
  constructor(transport: QuarkTransport) {{
    super(transport);
  }}

  /** The underlying transport (for advanced use). */
  get quarkTransport(): QuarkTransport {{
    return this.transport;
  }}

{accessors_block}

  /** Release transport resources. */
  async close(): Promise<void> {{
    await this.transport.close();
  }}
}}
"""
        parts.append(facade)

    output_path.write_text("".join(parts))
    print(f"wrote {output_path} ({len(services)} services)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    # --- auth.ts ---
    auth_services = parse_services(GEN_DIR / "auth_pb.ts")
    # Service descriptions (in proto declaration order)
    auth_service_docs = {
        "AuthService":          "platform.auth.v1.AuthService — authentication entry points",
        "UserService":          "platform.auth.v1.UserService — user CRUD + role assignment",
        "IdentityService":      "platform.auth.v1.IdentityService — linked OAuth identities",
        "MFAService":           "platform.auth.v1.MFAService — TOTP/phone/WebAuthn factor enrolment",
        "PasskeyService":       "platform.auth.v1.PasskeyService — WebAuthn passkey management",
        "SSOService":           "platform.auth.v1.SSOService — SAML SSO",
        "OAuthServerService":   "platform.auth.v1.OAuthServerService — Quark as OAuth2/OIDC provider",
        "AdminService":         "platform.auth.v1.AdminService — admin-only operations",
        "RoleService":          "platform.auth.v1.RoleService — role CRUD + permission grants",
        "PolicyService":        "platform.auth.v1.PolicyService — RBAC policy CRUD",
    }
    # Build a single imports block importing the descriptor and every message type
    # referenced by the RPCs.
    needed_types: set[str] = set()
    for svc in auth_services:
        for rpc in svc.rpcs:
            if not rpc.input_is_empty:
                needed_types.add(rpc.input_type)
            needed_types.add(rpc.output_type)
    # The generated auth_pb.ts exports every type. We import them by name.
    # `Empty` comes from `@bufbuild/protobuf/wkt` (well-known type) — the
    # generated _connect.ts imports it from there, not from auth_pb.ts.
    auth_pb_types = sorted(t for t in needed_types if t != "Empty")
    auth_imports = []
    # Service descriptors (each as <Name> as <Name>Desc to avoid name clash).
    # In v2 codegen, both service descriptors AND message types live in
    # *_pb.ts. We import descriptors as values (with `as <Name>Desc` aliases
    # to avoid clashing with the SDK wrapper class names) and message types
    # as types, both from the same module.
    auth_imports.append("import {\n  " + ",\n  ".join(
        f"{svc.name} as {svc.name}Desc" for svc in auth_services
    ) + ",\n} from '../gen/auth_pb.js';")
    if auth_pb_types:
        auth_imports.append("import type {\n  " + ",\n  ".join(auth_pb_types) + ",\n} from '../gen/auth_pb.js';")
    # Empty (well-known type) — only if any RPC uses it.
    if "Empty" in needed_types:
        auth_imports.append("import type { Empty } from '@bufbuild/protobuf/wkt';")

    auth_accessors = [
        ("users",       "UserService",         "platform.auth.v1.UserService — user CRUD + role assignment (7 RPCs)."),
        ("identity",    "IdentityService",     "platform.auth.v1.IdentityService — OAuth identity management (3 RPCs)."),
        ("mfa",         "MFAService",          "platform.auth.v1.MFAService — TOTP/phone/WebAuthn factor enrolment (5 RPCs)."),
        ("passkey",     "PasskeyService",      "platform.auth.v1.PasskeyService — WebAuthn passkey management (7 RPCs)."),
        ("sso",         "SSOService",          "platform.auth.v1.SSOService — SAML SSO (3 RPCs)."),
        ("oauthServer", "OAuthServerService",  "platform.auth.v1.OAuthServerService — Quark as OAuth2/OIDC provider (8 RPCs)."),
        ("admin",       "AdminService",        "platform.auth.v1.AdminService — admin-only operations (28 RPCs)."),
        ("role",        "RoleService",         "platform.auth.v1.RoleService — role CRUD + permission grants (7 RPCs)."),
        ("policy",      "PolicyService",       "platform.auth.v1.PolicyService — RBAC policy CRUD (4 RPCs)."),
    ]
    auth_services_with_docs = [
        (svc, auth_service_docs.get(svc.name, svc.name))
        for svc in auth_services
    ]
    # Reorder so AuthService is first (it's the facade base class)
    auth_services_with_docs.sort(key=lambda x: 0 if x[0].name == "AuthService" else 1)
    emit_file(
        output_path=OUT_DIR / "auth.ts",
        imports=auth_imports,
        services=auth_services_with_docs,
        proto_file_stems=["auth"],
        facade_class_name="AuthClient",
        facade_base_class="AuthService",
        facade_doc=(
            "Client for the Quark auth component.\n\n"
            "Extends {@link AuthService} so all 19 authentication RPCs (`login`,\n"
            "`signup`, `token`, `verify`, etc.) are callable directly. The\n"
            "remaining 9 services are accessed via lazy accessors (`users()`,\n"
            "`mfa()`, `admin()`, etc.).\n\n"
            "NOTE: `organization()` / `project()` / `workspace()` accessors used\n"
            "to live here but have been migrated to `ServerClient` (see\n"
            "`src/services/server.ts`) along with the underlying services' move\n"
            "from `platform.auth.v1` to `platform.server.v1`.\n\n"
            "Usage:\n"
            "```ts\n"
            "const auth = new AuthClient(transport);\n"
            "await auth.login({ handle: '…', apiKey: '…' });   // direct — no .auth() needed\n"
            "await auth.users().createUser({ … });               // via accessor\n"
            "await auth.mfa().enrollFactor({ … });               // via accessor\n"
            "```"
        ),
        facade_accessors=auth_accessors,
    )

    # --- server.ts ---
    server_services = parse_services(GEN_DIR / "server_pb.ts")
    server_service_docs = {
        "ServerService":         "platform.server.v1.ServerService — orchestration, service registry, admin API",
        "OrganizationService":   "platform.server.v1.OrganizationService — organization CRUD + lifecycle",
        "ProjectService":        "platform.server.v1.ProjectService — project CRUD + lifecycle (org-scoped)",
        "WorkspaceService":      "platform.server.v1.WorkspaceService — workspace CRUD + lifecycle (project-scoped)",
    }
    needed_types = set()
    for svc in server_services:
        for rpc in svc.rpcs:
            if not rpc.input_is_empty:
                needed_types.add(rpc.input_type)
            needed_types.add(rpc.output_type)
    server_pb_types = sorted(t for t in needed_types if t != "Empty")
    server_imports = []
    server_imports.append("import {\n  " + ",\n  ".join(
        f"{svc.name} as {svc.name}Desc" for svc in server_services
    ) + ",\n} from '../gen/server_pb.js';")
    if server_pb_types:
        server_imports.append("import type {\n  " + ",\n  ".join(server_pb_types) + ",\n} from '../gen/server_pb.js';")
    if "Empty" in needed_types:
        server_imports.append("import type { Empty } from '@bufbuild/protobuf/wkt';")

    server_accessors = [
        ("organization", "OrganizationService", "platform.server.v1.OrganizationService — organization CRUD + lifecycle (8 RPCs)."),
        ("project",      "ProjectService",      "platform.server.v1.ProjectService — project CRUD + lifecycle (8 RPCs)."),
        ("workspace",    "WorkspaceService",    "platform.server.v1.WorkspaceService — workspace CRUD + lifecycle (8 RPCs)."),
    ]
    server_services_with_docs = [
        (svc, server_service_docs.get(svc.name, svc.name))
        for svc in server_services
    ]
    server_services_with_docs.sort(key=lambda x: 0 if x[0].name == "ServerService" else 1)
    emit_file(
        output_path=OUT_DIR / "server.ts",
        imports=server_imports,
        services=server_services_with_docs,
        proto_file_stems=["server"],
        facade_class_name="ServerClient",
        facade_base_class="ServerService",
        facade_doc=(
            "Client for the Quark server component.\n\n"
            "Extends {@link ServerService} so all 8 orchestration RPCs\n"
            "(`getServiceRegistry`, `deploy`, `rollback`, `provisionTenant`, …)\n"
            "are callable directly. The remaining 3 services (organizations /\n"
            "projects / workspaces) are accessed via lazy accessors.\n\n"
            "Usage:\n"
            "```ts\n"
            "const server = new ServerClient(transport);\n"
            "await server.deploy({ versionId: '…', workflowId: '…', input: … });  // direct\n"
            "await server.organizations().createOrganization({ … });              // via accessor\n"
            "```"
        ),
        facade_accessors=server_accessors,
    )

    # --- node.ts ---
    node_services = parse_services(GEN_DIR / "node_pb.ts")
    node_service_docs = {
        "NodeService": "quark.node.v1.NodeService — node execution daemon API",
    }
    needed_types = set()
    for svc in node_services:
        for rpc in svc.rpcs:
            if not rpc.input_is_empty:
                needed_types.add(rpc.input_type)
            needed_types.add(rpc.output_type)
    node_pb_types = sorted(t for t in needed_types if t != "Empty")
    node_imports = []
    node_imports.append("import {\n  " + ",\n  ".join(
        f"{svc.name} as {svc.name}Desc" for svc in node_services
    ) + ",\n} from '../gen/node_pb.js';")
    if node_pb_types:
        node_imports.append("import type {\n  " + ",\n  ".join(node_pb_types) + ",\n} from '../gen/node_pb.js';")
    if "Empty" in needed_types:
        node_imports.append("import type { Empty } from '@bufbuild/protobuf/wkt';")
    node_services_with_docs = [
        (svc, node_service_docs.get(svc.name, svc.name))
        for svc in node_services
    ]
    emit_file(
        output_path=OUT_DIR / "node.ts",
        imports=node_imports,
        services=node_services_with_docs,
        proto_file_stems=["node"],
        facade_class_name=None,
        facade_base_class=None,
        facade_doc=None,
        facade_accessors=None,
    )

    # --- workflow.ts ---
    workflow_services = parse_services(GEN_DIR / "workflow_pb.ts")
    workflow_service_docs = {
        "WorkflowService": "platform.workflow.v1.WorkflowService — workflow + run lifecycle proxy",
    }
    needed_types = set()
    for svc in workflow_services:
        for rpc in svc.rpcs:
            if not rpc.input_is_empty:
                needed_types.add(rpc.input_type)
            needed_types.add(rpc.output_type)
    workflow_pb_types = sorted(t for t in needed_types if t != "Empty")
    workflow_imports = []
    workflow_imports.append("import {\n  " + ",\n  ".join(
        f"{svc.name} as {svc.name}Desc" for svc in workflow_services
    ) + ",\n} from '../gen/workflow_pb.js';")
    if workflow_pb_types:
        workflow_imports.append("import type {\n  " + ",\n  ".join(workflow_pb_types) + ",\n} from '../gen/workflow_pb.js';")
    if "Empty" in needed_types:
        workflow_imports.append("import type { Empty } from '@bufbuild/protobuf/wkt';")
    workflow_services_with_docs = [
        (svc, workflow_service_docs.get(svc.name, svc.name))
        for svc in workflow_services
    ]
    emit_file(
        output_path=OUT_DIR / "workflow.ts",
        imports=workflow_imports,
        services=workflow_services_with_docs,
        proto_file_stems=["workflow"],
        facade_class_name=None,
        facade_base_class=None,
        facade_doc=None,
        facade_accessors=None,
    )

    # Print a summary
    print("\n=== Summary ===")
    for fname, services in [
        ("auth.ts", auth_services),
        ("server.ts", server_services),
        ("node.ts", node_services),
        ("workflow.ts", workflow_services),
    ]:
        total_rpcs = sum(len(s.rpcs) for s in services)
        print(f"  {fname}: {len(services)} services, {total_rpcs} RPCs")


if __name__ == "__main__":
    main()
