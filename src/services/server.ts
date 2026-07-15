/**
 * Server (control-plane) service client.
 *
 * Wraps the `platform.controlplane.v1.ControlPlaneService` gRPC service — the
 * orchestration, service-registry, and admin API exposed by the Quarkloop
 * server component. This is explicitly NOT a data-plane gateway: client CRUD
 * traffic never flows through here.
 *
 * The service exposes 8 RPCs:
 *
 * | RPC                  | Purpose                                                 |
 * |----------------------|---------------------------------------------------------|
 * | GetServiceRegistry   | Fetch the cached registry of sibling service endpoints |
 * | Deploy               | Kick off a deployment via a workflow run                |
 * | Rollback             | Roll a deployment back to its previous version          |
 * | GetDeployment        | Fetch a single deployment by ID                         |
 * | ListDeployments      | Page through deployments                                |
 * | ProvisionTenant      | Provision a new tenant (org + artifact + secret)       |
 * | ListTenants          | Page through tenants (admin)                            |
 * | GetSystemHealth      | Aggregate health of all sibling services (admin)        |
 *
 * Request and response messages are typed `unknown` until `buf generate` is
 * wired up; see the package-level README for the codegen roadmap.
 */

import type { QuarkCallOptions, QuarkTransport } from './transport.ts';
import { ServiceClient } from './transport.ts';

/**
 * `platform.controlplane.v1.ControlPlaneService` — orchestration, service
 * registry, and admin API (8 RPCs).
 */
export class ControlPlaneService extends ServiceClient {
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
   * Provision a new tenant: creates an organisation in auth-service, a
   * default artifact in release-service, and a bootstrap secret in
   * secrets-service. Returns the created `Tenant`.
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

/**
 * Client for the Quarkloop server (control-plane) component.
 *
 * Holds one {@link QuarkTransport} bound to the control-plane endpoint and
 * exposes the {@link ControlPlaneService}.
 */
export class ServerClient {
  private readonly transport: QuarkTransport;
  private _controlPlane?: ControlPlaneService;

  /** @internal Constructed by {@link QuarkClientBuilder.build}. */
  constructor(transport: QuarkTransport) {
    this.transport = transport;
  }

  /** The underlying transport (for advanced use). */
  get quarkTransport(): QuarkTransport {
    return this.transport;
  }

  /** `platform.controlplane.v1.ControlPlaneService` (8 RPCs). */
  controlPlane(): ControlPlaneService {
    return (this._controlPlane ??= new ControlPlaneService(
      this.transport,
      'platform.controlplane.v1.ControlPlaneService',
    ));
  }

  /** Release transport resources. */
  async close(): Promise<void> {
    await this.transport.close();
  }
}
