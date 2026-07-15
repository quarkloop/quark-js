/**
 * Auth service client.
 *
 * Wraps all 13 gRPC services exposed by the Quark auth component
 * (`platform.auth.v1`):
 *
 * | Service                | RPCs | Purpose                                              |
 * |------------------------|------|------------------------------------------------------|
 * | AuthService            | 19   | Login, signup, token, verify, OIDC, JWKS, health    |
 * | UserService            | 7    | User CRUD + role assignment                          |
 * | IdentityService        | 3    | Linked OAuth identities                              |
 * | MFAService             | 5    | TOTP / phone / WebAuthn factor enrolment             |
 * | PasskeyService         | 7    | WebAuthn passkey registration & authentication       |
 * | SSOService             | 3    | SAML SSO                                             |
 * | OAuthServerService     | 8    | Quark acting as an OAuth2/OIDC provider          |
 * | AdminService           | 28   | Admin-only user/factor/passkey/SSO/OAuth management  |
 * | OrganizationService    | 8    | Organization CRUD + lifecycle                        |
 * | ProjectService         | 8    | Project CRUD + lifecycle                             |
 * | WorkspaceService       | 8    | Workspace CRUD + lifecycle                           |
 * | RoleService            | 7    | Role CRUD + permission grants                        |
 * | PolicyService          | 4    | RBAC policy CRUD                                     |
 * | Total                  | 115  |                                                      |
 *
 * Every RPC method on every service class below takes a `request: unknown`
 * (the JSON-serialisable request message) and returns a `Promise<unknown>`
 * (the JSON-parsed response message). The `unknown` typing is intentional:
 * generated TypeScript types from `buf generate` are not yet wired into this
 * package. When they land, each service class will be replaced by a thin
 * wrapper around `createClient(<generated service descriptor>, transport)`,
 * and the method signatures will narrow to the generated request/response
 * types — but the public method names and the builder/facade wiring will not
 * change.
 */

import type { QuarkCallOptions, QuarkTransport } from '../transport.ts';
import { ServiceClient } from '../transport.ts';


// ─── AuthService ──────────────────────────────────────────────────────────

/** `platform.auth.v1.AuthService` — authentication entry points (19 RPCs). */
export class AuthService extends ServiceClient {
  /** Existing API-key auth: exchange `handle` + `api_key` for a token pair. */
  login(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Login', request, options);
  }
  /** Exchange a refresh token for a new access/refresh token pair. */
  refresh(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Refresh', request, options);
  }
  /** Log out, revoking the refresh token (scope: `global` | `local` | `others`). */
  logout(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Logout', request, options);
  }
  /** Verify an access token and return the identity it represents. */
  verifyToken(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('VerifyToken', request, options);
  }
  /** Supabase-style email/phone signup with optional PKCE + user metadata. */
  signup(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Signup', request, options);
  }
  /** OAuth2 token endpoint — handles all grant types. */
  token(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Token', request, options);
  }
  /** Verify a signup/recovery/magic-link/email-change/phone-change token. */
  verify(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Verify', request, options);
  }
  /** Send a magic-link email. */
  magicLink(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('MagicLink', request, options);
  }
  /** Send an OTP via SMS/WhatsApp for signup or phone change. */
  otp(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Otp', request, options);
  }
  /** Send a password-recovery email. */
  recover(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Recover', request, options);
  }
  /** Resend a signup/SMS/email-change/phone-change OTP. */
  resend(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Resend', request, options);
  }
  /** Trigger a reauthentication flow (sends a new verification email). */
  reauthenticate(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Reauthenticate', request, options);
  }
  /** Public auth settings (enabled providers, MFA, OAuth server, SAML, etc.). */
  getSettings(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('GetSettings', request, options);
  }
  /** JWKS — public signing keys for JWT verification. */
  getJwks(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('GetJwks', request, options);
  }
  /** OpenID Connect discovery document. */
  getOpenIdConfiguration(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('GetOpenIdConfiguration', request, options);
  }
  /** Liveness probe. */
  health(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Health', request, options);
  }
  /** Get the redirect URL to start an external OAuth provider flow. */
  externalProviderRedirect(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('ExternalProviderRedirect', request, options);
  }
  /** Complete an external OAuth provider flow (exchange code for tokens). */
  externalProviderCallback(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('ExternalProviderCallback', request, options);
  }
  /** Invite a user by email. */
  invite(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Invite', request, options);
  }
}

// ─── UserService ──────────────────────────────────────────────────────────

/** `platform.auth.v1.UserService` — user CRUD + role assignment (7 RPCs). */
export class UserService extends ServiceClient {
  createUser(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('CreateUser', request, options);
  }
  getUser(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('GetUser', request, options);
  }
  listUsers(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('ListUsers', request, options);
  }
  updateUser(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('UpdateUser', request, options);
  }
  deleteUser(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('DeleteUser', request, options);
  }
  assignRole(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('AssignRole', request, options);
  }
  revokeRole(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('RevokeRole', request, options);
  }
}

// ─── IdentityService ──────────────────────────────────────────────────────

/** `platform.auth.v1.IdentityService` — OAuth identity management (3 RPCs). */
export class IdentityService extends ServiceClient {
  listIdentities(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('ListIdentities', request, options);
  }
  linkIdentity(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('LinkIdentity', request, options);
  }
  deleteIdentity(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('DeleteIdentity', request, options);
  }
}

// ─── MFAService ───────────────────────────────────────────────────────────

/** `platform.auth.v1.MFAService` — multi-factor authentication (5 RPCs). */
export class MFAService extends ServiceClient {
  enrollFactor(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('EnrollFactor', request, options);
  }
  challengeFactor(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('ChallengeFactor', request, options);
  }
  verifyFactor(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('VerifyFactor', request, options);
  }
  unenrollFactor(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('UnenrollFactor', request, options);
  }
  listFactors(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('ListFactors', request, options);
  }
}

// ─── PasskeyService ───────────────────────────────────────────────────────

/** `platform.auth.v1.PasskeyService` — WebAuthn passkey management (7 RPCs). */
export class PasskeyService extends ServiceClient {
  /** Anonymous: get authentication options for a WebAuthn login flow. */
  passkeyAuthenticationOptions(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('PasskeyAuthenticationOptions', request, options);
  }
  /** Anonymous: complete a WebAuthn login by verifying the assertion. */
  passkeyAuthenticationVerify(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('PasskeyAuthenticationVerify', request, options);
  }
  /** Authenticated: get registration options for adding a new passkey. */
  passkeyRegistrationOptions(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('PasskeyRegistrationOptions', request, options);
  }
  /** Authenticated: complete a passkey registration by verifying the attestation. */
  passkeyRegistrationVerify(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('PasskeyRegistrationVerify', request, options);
  }
  listPasskeys(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('ListPasskeys', request, options);
  }
  updatePasskey(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('UpdatePasskey', request, options);
  }
  deletePasskey(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('DeletePasskey', request, options);
  }
}

// ─── SSOService ───────────────────────────────────────────────────────────

/** `platform.auth.v1.SSOService` — SAML SSO (3 RPCs). */
export class SSOService extends ServiceClient {
  /** Start a SAML SSO flow by redirecting to the IdP. */
  ssoRedirect(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('SSORedirect', request, options);
  }
  /** SAML Assertion Consumer Service — exchange a SAML response for tokens. */
  samlAcs(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('SAMLACS', request, options);
  }
  /** Service-provider metadata XML. */
  samlMetadata(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('SAMLMetadata', request, options);
  }
}

// ─── OAuthServerService ───────────────────────────────────────────────────

/**
 * `platform.auth.v1.OAuthServerService` — Quark as an OAuth2/OIDC provider
 * (8 RPCs).
 */
export class OAuthServerService extends ServiceClient {
  /** OAuth2 authorize endpoint. */
  oauthServerAuthorize(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('OAuthServerAuthorize', request, options);
  }
  /** OAuth2 token endpoint (authorization-code & refresh-token grants). */
  oauthServerToken(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('OAuthServerToken', request, options);
  }
  /** OIDC userinfo endpoint. */
  oauthServerUserInfo(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('OAuthServerUserInfo', request, options);
  }
  /** RFC 7591 dynamic client registration. */
  oauthServerClientDynamicRegister(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('OAuthServerClientDynamicRegister', request, options);
  }
  /** Authenticated: fetch a pending authorisation for the current user. */
  oauthServerGetAuthorization(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('OAuthServerGetAuthorization', request, options);
  }
  /** Authenticated: record the user's consent and issue tokens. */
  oauthServerConsent(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('OAuthServerConsent', request, options);
  }
  /** Authenticated: list OAuth grants for the current user. */
  userListOAuthGrants(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('UserListOAuthGrants', request, options);
  }
  /** Authenticated: revoke an OAuth grant for the current user. */
  userRevokeOAuthGrant(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('UserRevokeOAuthGrant', request, options);
  }
}

// ─── AdminService ─────────────────────────────────────────────────────────

/**
 * `platform.auth.v1.AdminService` — admin-only operations (28 RPCs).
 *
 * Every RPC requires an admin-role bearer token.
 */
export class AdminService extends ServiceClient {
  // ── User management ───────────────────────────────────────────────────
  adminListUsers(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('AdminListUsers', request, options);
  }
  adminCreateUser(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('AdminCreateUser', request, options);
  }
  adminGetUser(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('AdminGetUser', request, options);
  }
  adminUpdateUser(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('AdminUpdateUser', request, options);
  }
  adminDeleteUser(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('AdminDeleteUser', request, options);
  }
  /** Generate a one-time link (invite, recovery, magic-link, email change). */
  adminGenerateLink(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminGenerateLink', request, options);
  }

  // ── Factor management ─────────────────────────────────────────────────
  adminListUserFactors(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminListUserFactors', request, options);
  }
  adminDeleteFactor(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('AdminDeleteFactor', request, options);
  }
  adminUpdateFactor(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('AdminUpdateFactor', request, options);
  }

  // ── Passkey management ────────────────────────────────────────────────
  adminListPasskeys(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminListPasskeys', request, options);
  }
  adminDeletePasskey(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminDeletePasskey', request, options);
  }

  // ── Audit log ─────────────────────────────────────────────────────────
  adminListAuditLogs(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminListAuditLogs', request, options);
  }

  // ── SSO provider management ───────────────────────────────────────────
  adminListSSOProviders(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminListSSOProviders', request, options);
  }
  adminCreateSSOProvider(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminCreateSSOProvider', request, options);
  }
  adminGetSSOProvider(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminGetSSOProvider', request, options);
  }
  adminUpdateSSOProvider(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminUpdateSSOProvider', request, options);
  }
  adminDeleteSSOProvider(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminDeleteSSOProvider', request, options);
  }

  // ── OAuth client management ───────────────────────────────────────────
  adminOAuthClientRegister(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminOAuthClientRegister', request, options);
  }
  adminOAuthClientList(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminOAuthClientList', request, options);
  }
  adminOAuthClientGet(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminOAuthClientGet', request, options);
  }
  adminOAuthClientUpdate(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminOAuthClientUpdate', request, options);
  }
  adminOAuthClientDelete(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminOAuthClientDelete', request, options);
  }
  adminOAuthClientRegenerateSecret(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminOAuthClientRegenerateSecret', request, options);
  }

  // ── Custom OAuth provider management ──────────────────────────────────
  adminListCustomOAuthProviders(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminListCustomOAuthProviders', request, options);
  }
  adminCreateCustomOAuthProvider(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminCreateCustomOAuthProvider', request, options);
  }
  adminGetCustomOAuthProvider(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminGetCustomOAuthProvider', request, options);
  }
  adminUpdateCustomOAuthProvider(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminUpdateCustomOAuthProvider', request, options);
  }
  adminDeleteCustomOAuthProvider(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('AdminDeleteCustomOAuthProvider', request, options);
  }
}

// ─── OrganizationService ──────────────────────────────────────────────────

/** `platform.auth.v1.OrganizationService` — organization CRUD + lifecycle (8 RPCs). */
export class OrganizationService extends ServiceClient {
  createOrganization(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('CreateOrganization', request, options);
  }
  getOrganization(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('GetOrganization', request, options);
  }
  listOrganizations(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('ListOrganizations', request, options);
  }
  updateOrganization(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('UpdateOrganization', request, options);
  }
  activateOrganization(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('ActivateOrganization', request, options);
  }
  deactivateOrganization(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('DeactivateOrganization', request, options);
  }
  archiveOrganization(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('ArchiveOrganization', request, options);
  }
  deleteOrganization(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('DeleteOrganization', request, options);
  }
}

// ─── ProjectService ───────────────────────────────────────────────────────

/** `platform.auth.v1.ProjectService` — project CRUD + lifecycle (8 RPCs). */
export class ProjectService extends ServiceClient {
  createProject(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('CreateProject', request, options);
  }
  getProject(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('GetProject', request, options);
  }
  listProjects(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('ListProjects', request, options);
  }
  updateProject(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('UpdateProject', request, options);
  }
  activateProject(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('ActivateProject', request, options);
  }
  deactivateProject(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('DeactivateProject', request, options);
  }
  archiveProject(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('ArchiveProject', request, options);
  }
  deleteProject(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('DeleteProject', request, options);
  }
}

// ─── WorkspaceService ─────────────────────────────────────────────────────

/** `platform.auth.v1.WorkspaceService` — workspace CRUD + lifecycle (8 RPCs). */
export class WorkspaceService extends ServiceClient {
  createWorkspace(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('CreateWorkspace', request, options);
  }
  getWorkspace(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('GetWorkspace', request, options);
  }
  listWorkspaces(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('ListWorkspaces', request, options);
  }
  updateWorkspace(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('UpdateWorkspace', request, options);
  }
  activateWorkspace(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('ActivateWorkspace', request, options);
  }
  deactivateWorkspace(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('DeactivateWorkspace', request, options);
  }
  archiveWorkspace(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('ArchiveWorkspace', request, options);
  }
  deleteWorkspace(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('DeleteWorkspace', request, options);
  }
}

// ─── RoleService ──────────────────────────────────────────────────────────

/** `platform.auth.v1.RoleService` — role CRUD + permission grants (7 RPCs). */
export class RoleService extends ServiceClient {
  createRole(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('CreateRole', request, options);
  }
  getRole(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('GetRole', request, options);
  }
  listRoles(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('ListRoles', request, options);
  }
  updateRole(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('UpdateRole', request, options);
  }
  deleteRole(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('DeleteRole', request, options);
  }
  grantPermission(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('GrantPermission', request, options);
  }
  revokePermission(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('RevokePermission', request, options);
  }
}

// ─── PolicyService ────────────────────────────────────────────────────────

/** `platform.auth.v1.PolicyService` — RBAC policy CRUD (4 RPCs). */
export class PolicyService extends ServiceClient {
  createPolicy(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('CreatePolicy', request, options);
  }
  getPolicy(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('GetPolicy', request, options);
  }
  listPolicies(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('ListPolicies', request, options);
  }
  deletePolicy(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('DeletePolicy', request, options);
  }
}

// ─── AuthClient facade ────────────────────────────────────────────────────

/**
 * Client for the Quark auth component.
 *
 * Extends {@link AuthService} so all 19 authentication RPCs (`login`,
 * `signup`, `token`, `verify`, etc.) are callable directly. The remaining 12
 * services are accessed via lazy accessors (`users()`, `mfa()`, `admin()`,
 * etc.).
 *
 * Usage:
 * ```ts
 * const auth = new AuthClient(transport);
 * await auth.login({ handle: '…', apiKey: '…' });   // direct — no .auth() needed
 * await auth.users().createUser({ … });               // via accessor
 * await auth.mfa().enrollFactor({ … });               // via accessor
 * ```
 */
export class AuthClient extends AuthService {
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

  /** @internal Constructed by {@link QuarkClientBuilder.build}. */
  constructor(transport: QuarkTransport) {
    super(transport, 'platform.auth.v1.AuthService');
  }

  /** The underlying transport (for advanced use). */
  get quarkTransport(): QuarkTransport {
    return this.transport;
  }

  /** `platform.auth.v1.UserService` — user CRUD + role assignment (7 RPCs). */
  users(): UserService {
    return (this._users ??= new UserService(this.transport, 'platform.auth.v1.UserService'));
  }

  /** `platform.auth.v1.IdentityService` — OAuth identity management (3 RPCs). */
  identity(): IdentityService {
    return (this._identity ??= new IdentityService(this.transport, 'platform.auth.v1.IdentityService'));
  }

  /** `platform.auth.v1.MFAService` — TOTP/phone/WebAuthn factor enrolment (5 RPCs). */
  mfa(): MFAService {
    return (this._mfa ??= new MFAService(this.transport, 'platform.auth.v1.MFAService'));
  }

  /** `platform.auth.v1.PasskeyService` — WebAuthn passkey management (7 RPCs). */
  passkey(): PasskeyService {
    return (this._passkey ??= new PasskeyService(this.transport, 'platform.auth.v1.PasskeyService'));
  }

  /** `platform.auth.v1.SSOService` — SAML SSO (3 RPCs). */
  sso(): SSOService {
    return (this._sso ??= new SSOService(this.transport, 'platform.auth.v1.SSOService'));
  }

  /** `platform.auth.v1.OAuthServerService` — Quark as OAuth2/OIDC provider (8 RPCs). */
  oauthServer(): OAuthServerService {
    return (this._oauthServer ??= new OAuthServerService(this.transport, 'platform.auth.v1.OAuthServerService'));
  }

  /** `platform.auth.v1.AdminService` — admin-only operations (28 RPCs). */
  admin(): AdminService {
    return (this._admin ??= new AdminService(this.transport, 'platform.auth.v1.AdminService'));
  }

  /** `platform.auth.v1.OrganizationService` — organization CRUD + lifecycle (8 RPCs). */
  organization(): OrganizationService {
    return (this._organization ??= new OrganizationService(this.transport, 'platform.auth.v1.OrganizationService'));
  }

  /** `platform.auth.v1.ProjectService` — project CRUD + lifecycle (8 RPCs). */
  project(): ProjectService {
    return (this._project ??= new ProjectService(this.transport, 'platform.auth.v1.ProjectService'));
  }

  /** `platform.auth.v1.WorkspaceService` — workspace CRUD + lifecycle (8 RPCs). */
  workspace(): WorkspaceService {
    return (this._workspace ??= new WorkspaceService(this.transport, 'platform.auth.v1.WorkspaceService'));
  }

  /** `platform.auth.v1.RoleService` — role CRUD + permission grants (7 RPCs). */
  role(): RoleService {
    return (this._role ??= new RoleService(this.transport, 'platform.auth.v1.RoleService'));
  }

  /** `platform.auth.v1.PolicyService` — RBAC policy CRUD (4 RPCs). */
  policy(): PolicyService {
    return (this._policy ??= new PolicyService(this.transport, 'platform.auth.v1.PolicyService'));
  }

  /** Release transport resources. */
  async close(): Promise<void> {
    await this.transport.close();
  }
}
