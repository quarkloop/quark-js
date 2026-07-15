/**
 * {@link QuarkClient} — the unified facade over all Quark gRPC services.
 *
 * Each accessor returns a service client directly — no intermediate wrapper
 * classes. For example, `quark.auth()` returns an {@link AuthService} (with
 * `login`, `signup`, etc.), not an `AuthClient` that you must call `.auth()`
 * on again.
 *
 * Construct a `QuarkClient` with {@link QuarkClientBuilder.build} — never
 * instantiate it directly.
 */

import { AuthService, UserService, IdentityService, MFAService, PasskeyService, SSOService, OAuthServerService, AdminService, OrganizationService, ProjectService, WorkspaceService, RoleService, PolicyService } from './services/auth.ts';
import { ControlPlaneService } from './services/server.ts';
import { NodeService } from './services/node.ts';
import { WorkflowService } from './services/workflow.ts';
import type { QuarkTransport } from './transport.ts';

/**
 * Constructor argument for {@link QuarkClient}. Produced by
 * {@link QuarkClientBuilder.build}; not intended to be hand-constructed.
 */
export interface QuarkClientConfig {
  // Auth transports (one transport shared by all 13 auth services)
  authTransport?: QuarkTransport;
  // Server transport
  serverTransport?: QuarkTransport;
  // Node transport
  nodeTransport?: QuarkTransport;
  // Workflow transport + defaults
  workflowTransport?: QuarkTransport;
  workflowNamespace?: string;
  workflowIdentity?: string;
}

/**
 * Unified client for the Quark platform.
 *
 * Each accessor returns the corresponding service client directly, or throws
 * if it was not configured. Use {@link hasAuth}, {@link hasServer},
 * {@link hasNode}, {@link hasWorkflow} to check availability without throwing.
 */
export class QuarkClient {
  // Auth services (all share one transport)
  private _auth?: AuthService;
  private _users?: UserService;
  private _identity?: IdentityService;
  private _mfa?: MFAService;
  private _passkey?: PasskeyService;
  private _sso?: SSOService;
  private _oauthServer?: OAuthServerService;
  private _admin?: AdminService;
  private _organization?: OrganizationService;
  private _project?: ProjectService;
  private _workspace?: WorkspaceService;
  private _role?: RoleService;
  private _policy?: PolicyService;

  // Server
  private _controlPlane?: ControlPlaneService;

  // Node
  private _node?: NodeService;

  // Workflow
  private _workflow?: WorkflowService;

  // Transports (for close())
  private readonly _authTransport?: QuarkTransport;
  private readonly _serverTransport?: QuarkTransport;
  private readonly _nodeTransport?: QuarkTransport;
  private readonly _workflowTransport?: QuarkTransport;

  /** @internal Use {@link QuarkClientBuilder.build}. */
  constructor(config: QuarkClientConfig) {
    this._authTransport = config.authTransport;
    this._serverTransport = config.serverTransport;
    this._nodeTransport = config.nodeTransport;
    this._workflowTransport = config.workflowTransport;
  }

  // ── Auth services ────────────────────────────────────────────────────

  /** `true` if an auth endpoint was configured on the builder. */
  hasAuth(): boolean { return this._authTransport !== undefined; }

  /** `platform.auth.v1.AuthService` — login, signup, token, verify, etc. (19 RPCs). */
  auth(): AuthService {
    return this._auth ??= new AuthService(this.requireTransport('auth'), 'platform.auth.v1.AuthService');
  }

  /** `platform.auth.v1.UserService` — user CRUD + role assignment (7 RPCs). */
  users(): UserService {
    return this._users ??= new UserService(this.requireTransport('auth'), 'platform.auth.v1.UserService');
  }

  /** `platform.auth.v1.IdentityService` — linked OAuth identities (3 RPCs). */
  identity(): IdentityService {
    return this._identity ??= new IdentityService(this.requireTransport('auth'), 'platform.auth.v1.IdentityService');
  }

  /** `platform.auth.v1.MFAService` — TOTP/phone/WebAuthn factor enrollment (5 RPCs). */
  mfa(): MFAService {
    return this._mfa ??= new MFAService(this.requireTransport('auth'), 'platform.auth.v1.MFAService');
  }

  /** `platform.auth.v1.PasskeyService` — WebAuthn passkey registration & auth (7 RPCs). */
  passkey(): PasskeyService {
    return this._passkey ??= new PasskeyService(this.requireTransport('auth'), 'platform.auth.v1.PasskeyService');
  }

  /** `platform.auth.v1.SSOService` — SAML SSO (3 RPCs). */
  sso(): SSOService {
    return this._sso ??= new SSOService(this.requireTransport('auth'), 'platform.auth.v1.SSOService');
  }

  /** `platform.auth.v1.OAuthServerService` — Quark as OAuth2/OIDC provider (8 RPCs). */
  oauthServer(): OAuthServerService {
    return this._oauthServer ??= new OAuthServerService(this.requireTransport('auth'), 'platform.auth.v1.OAuthServerService');
  }

  /** `platform.auth.v1.AdminService` — admin-only operations (28 RPCs). */
  admin(): AdminService {
    return this._admin ??= new AdminService(this.requireTransport('auth'), 'platform.auth.v1.AdminService');
  }

  /** `platform.auth.v1.OrganizationService` — organization CRUD + lifecycle (8 RPCs). */
  organization(): OrganizationService {
    return this._organization ??= new OrganizationService(this.requireTransport('auth'), 'platform.auth.v1.OrganizationService');
  }

  /** `platform.auth.v1.ProjectService` — project CRUD + lifecycle (8 RPCs). */
  project(): ProjectService {
    return this._project ??= new ProjectService(this.requireTransport('auth'), 'platform.auth.v1.ProjectService');
  }

  /** `platform.auth.v1.WorkspaceService` — workspace CRUD + lifecycle (8 RPCs). */
  workspace(): WorkspaceService {
    return this._workspace ??= new WorkspaceService(this.requireTransport('auth'), 'platform.auth.v1.WorkspaceService');
  }

  /** `platform.auth.v1.RoleService` — role CRUD + permission grants (7 RPCs). */
  role(): RoleService {
    return this._role ??= new RoleService(this.requireTransport('auth'), 'platform.auth.v1.RoleService');
  }

  /** `platform.auth.v1.PolicyService` — RBAC policy CRUD (4 RPCs). */
  policy(): PolicyService {
    return this._policy ??= new PolicyService(this.requireTransport('auth'), 'platform.auth.v1.PolicyService');
  }

  // ── Server ───────────────────────────────────────────────────────────

  /** `true` if a server endpoint was configured. */
  hasServer(): boolean { return this._serverTransport !== undefined; }

  /** `platform.controlplane.v1.ControlPlaneService` — orchestration, registry, admin (8 RPCs). */
  controlPlane(): ControlPlaneService {
    return this._controlPlane ??= new ControlPlaneService(this.requireTransport('server'), 'platform.controlplane.v1.ControlPlaneService');
  }

  // ── Node ─────────────────────────────────────────────────────────────

  /** `true` if a node endpoint was configured. */
  hasNode(): boolean { return this._nodeTransport !== undefined; }

  /** `quark.node.v1.NodeService` — node execution daemon API (7 RPCs). */
  node(): NodeService {
    return this._node ??= new NodeService(this.requireTransport('node'), 'quark.node.v1.NodeService');
  }

  // ── Workflow ─────────────────────────────────────────────────────────

  /** `true` if a workflow endpoint was configured. */
  hasWorkflow(): boolean { return this._workflowTransport !== undefined; }

  /** `platform.workflow.v1.WorkflowService` — workflow metadata + run lifecycle (9 RPCs). */
  workflow(): WorkflowService {
    return this._workflow ??= new WorkflowService(
      this.requireTransport('workflow'),
      'platform.workflow.v1.WorkflowService',
      this._workflowNamespace,
      this._workflowIdentity,
    );
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  private _workflowNamespace?: string;
  private _workflowIdentity?: string;

  /** @internal */
  setWorkflowDefaults(namespace?: string, identity?: string): void {
    this._workflowNamespace = namespace;
    this._workflowIdentity = identity;
  }

  /**
   * Close every configured transport, releasing resources.
   * Never throws — close errors are swallowed and reported via the optional
   * `onError` callback so that one failing close doesn't mask others.
   */
  async close(onError?: (err: unknown) => void): Promise<void> {
    const closers: Array<Promise<void>> = [];
    if (this._authTransport) closers.push(this._authTransport.close().catch((e) => onError?.(e)));
    if (this._serverTransport) closers.push(this._serverTransport.close().catch((e) => onError?.(e)));
    if (this._nodeTransport) closers.push(this._nodeTransport.close().catch((e) => onError?.(e)));
    if (this._workflowTransport) closers.push(this._workflowTransport.close().catch((e) => onError?.(e)));
    await Promise.all(closers);
  }

  private requireTransport(name: string): QuarkTransport {
    const transport = name === 'auth' ? this._authTransport
      : name === 'server' ? this._serverTransport
      : name === 'node' ? this._nodeTransport
      : name === 'workflow' ? this._workflowTransport
      : undefined;
    if (!transport) {
      throw new Error(
        `QuarkClient.${name}() called but no ${name} endpoint was configured. ` +
        `Call QuarkClientBuilder.${name}Endpoint(url) before build().`,
      );
    }
    return transport;
  }
}
