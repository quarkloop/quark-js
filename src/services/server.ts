/**
 * Server (server) service client.
 *
 * Wraps the four gRPC services exposed by the Quark server component
 * (`platform.server.v1`):
 *
 * | Service              | RPCs | Purpose                                                 |
 * |----------------------|------|---------------------------------------------------------|
 * | ServerService        | 8    | Orchestration, service registry, admin API              |
 * | OrganizationService  | 8    | Organization CRUD + lifecycle                           |
 * | ProjectService       | 8    | Project CRUD + lifecycle (org-scoped)                   |
 * | WorkspaceService     | 8    | Workspace CRUD + lifecycle (project-scoped)             |
 * | Total                | 32   |                                                         |
 *
 * `ServerService` is *not* a data-plane gateway: client CRUD traffic for the
 * orchestration RPCs never flows through it. However, organizations / projects
 * / workspaces are first-class CRUD resources served by the server itself (as
 * of the org/project/workspace migration from auth-service to the server).
 *
 * The server installs a single `AuthInterceptor` on every service (see
 * `server/src/main.rs`), so **every RPC requires a valid bearer token**.
 * Each method on these service classes takes a `request: unknown` (the
 * JSON-serialisable request message) and returns a `Promise<unknown>`.
 *
 * Request and response messages are typed `unknown` until `buf generate` is
 * wired up; see the package-level README for the codegen roadmap.
 */

import type { QuarkCallOptions, QuarkTransport } from '../transport.ts';
import { ServiceClient } from '../transport.ts';

/**
 * `platform.server.v1.ServerService` — orchestration, service
 * registry, and admin API (8 RPCs).
 */
export class ServerService extends ServiceClient {
  /**
   * Fetch the service registry — the list of sibling service endpoints
   * (`auth`, `release`, `workflow`, `nodes`, `secrets`) with their gRPC URLs
   * and versions. Clients fetch this once and cache.
   */
  getServiceRegistry(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('GetServiceRegistry', request, options);
  }

  /**
   * Deploy a release version by kicking off the named deployment workflow.
   * Returns the created `Deployment` (status `DEPLOYING`).
   */
  deploy(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Deploy', request, options);
  }

  /**
   * Roll back an existing deployment to its previous version. Returns the
   * `Deployment` (status `ROLLED_BACK` on success).
   */
  rollback(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('Rollback', request, options);
  }

  /** Fetch a single deployment by ID. */
  getDeployment(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('GetDeployment', request, options);
  }

  /** Page through deployments. */
  listDeployments(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('ListDeployments', request, options);
  }

  /**
   * Provision a new tenant: creates an organisation (now served by the
   * server itself), a default artifact in release-service, and a bootstrap
   * secret in secrets-service. Returns the created `Tenant`.
   */
  provisionTenant(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('ProvisionTenant', request, options);
  }

  /** Page through tenants (admin only). */
  listTenants(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc('ListTenants', request, options);
  }

  /**
   * Aggregate health of every sibling service (admin only). Returns a
   * `SystemHealth` with per-service health entries and a check timestamp.
   */
  getSystemHealth(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc('GetSystemHealth', request, options);
  }
}

// ─── OrganizationService ──────────────────────────────────────────────────

/** `platform.server.v1.OrganizationService` — organization CRUD + lifecycle (8 RPCs). */
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

/** `platform.server.v1.ProjectService` — project CRUD + lifecycle (8 RPCs). */
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

/** `platform.server.v1.WorkspaceService` — workspace CRUD + lifecycle (8 RPCs). */
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

/**
 * Client for the Quark server (server) component.
 *
 * Extends {@link ServerService} so all 8 orchestration RPCs
 * (`getServiceRegistry`, `deploy`, `rollback`, `provisionTenant`, …) are
 * callable directly. The remaining 3 services (organizations / projects /
 * workspaces) are accessed via lazy accessors.
 *
 * Usage:
 * ```ts
 * const server = new ServerClient(transport);
 * await server.deploy({ versionId: '…', workflowId: '…', input: … });  // direct
 * await server.organizations().createOrganization({ … });              // via accessor
 * ```
 */
export class ServerClient extends ServerService {
  private _organization?: OrganizationService;
  private _project?: ProjectService;
  private _workspace?: WorkspaceService;

  /** @internal Constructed by {@link QuarkClientBuilder.build}. */
  constructor(transport: QuarkTransport) {
    super(transport, 'platform.server.v1.ServerService');
  }

  /** The underlying transport (for advanced use). */
  get quarkTransport(): QuarkTransport {
    return this.transport;
  }

  /** `platform.server.v1.OrganizationService` — organization CRUD + lifecycle (8 RPCs). */
  organization(): OrganizationService {
    return (this._organization ??= new OrganizationService(
      this.transport,
      'platform.server.v1.OrganizationService',
    ));
  }

  /** `platform.server.v1.ProjectService` — project CRUD + lifecycle (8 RPCs). */
  project(): ProjectService {
    return (this._project ??= new ProjectService(
      this.transport,
      'platform.server.v1.ProjectService',
    ));
  }

  /** `platform.server.v1.WorkspaceService` — workspace CRUD + lifecycle (8 RPCs). */
  workspace(): WorkspaceService {
    return (this._workspace ??= new WorkspaceService(
      this.transport,
      'platform.server.v1.WorkspaceService',
    ));
  }

  /** Release transport resources. */
  async close(): Promise<void> {
    await this.transport.close();
  }
}
