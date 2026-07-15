/**
 * Workflow service client.
 *
 * Wraps the `platform.workflow.v1.WorkflowService` gRPC service — the
 * metadata + lifecycle proxy for workflows. This service owns workflow and
 * run metadata and delegates actual execution to the external workflow
 * engine (Temporal).
 *
 * The service exposes 9 RPCs:
 *
 * | RPC              | Purpose                                              |
 * |------------------|------------------------------------------------------|
 * | CreateWorkflow   | Register a new workflow definition                   |
 * | GetWorkflow      | Fetch a workflow by ID                               |
 * | ListWorkflows    | Page through workflows                               |
 * | UpdateWorkflow   | Update a workflow's name/description                 |
 * | DeleteWorkflow   | Delete a workflow                                     |
 * | StartRun         | Start a new run of a workflow (proxied to engine)   |
 * | GetRun           | Fetch a run by ID                                    |
 * | CancelRun        | Cancel a run (proxied to engine)                     |
 * | ListRuns         | Page through runs of a workflow                      |
 *
 * ## Default namespace & identity
 *
 * Workflows in the Quarkloop platform are namespaced. A {@link WorkflowClient}
 * carries an optional default `namespace` and `identity` (caller identity),
 * set via {@link QuarkClientBuilder.workflowNamespace} and
 * {@link QuarkClientBuilder.workflowIdentity}. When present, these defaults
 * are shallow-merged into every request input — `namespace` and `identity`
 * fields supplied explicitly in the request take precedence.
 *
 * Request and response messages are typed `unknown` until `buf generate` is
 * wired up; see the package-level README for the codegen roadmap.
 */

import type { QuarkCallOptions, QuarkTransport } from '../transport.ts';
import { ServiceClient } from '../transport.ts';

/**
 * Shallow-merge the client's default namespace/identity into a request input.
 *
 * Caller-supplied keys always win. The merge is intentionally shallow — deep
 * merging would surprise callers who expect nested objects to be replaced.
 */
function withDefaults(
  input: unknown,
  namespace: string | undefined,
  identity: string | undefined,
): unknown {
  if (namespace === undefined && identity === undefined) {
    return input;
  }
  if (input === null || input === undefined) {
    const out: Record<string, string> = {};
    if (namespace !== undefined) out.namespace = namespace;
    if (identity !== undefined) out.identity = identity;
    return out;
  }
  if (typeof input !== 'object') {
    // Non-object input cannot carry defaults — return as-is.
    return input;
  }
  const merged: Record<string, unknown> = { ...(input as Record<string, unknown>) };
  if (namespace !== undefined && merged.namespace === undefined) {
    merged.namespace = namespace;
  }
  if (identity !== undefined && merged.identity === undefined) {
    merged.identity = identity;
  }
  return merged;
}

/**
 * `platform.workflow.v1.WorkflowService` — workflow metadata + run lifecycle
 * (9 RPCs).
 *
 * Instances carry an optional default `namespace` and `identity` that are
 * merged into every request.
 */
export class WorkflowService extends ServiceClient {
  private readonly defaultNamespace?: string;
  private readonly defaultIdentity?: string;

  /** @internal Constructed by {@link WorkflowClient}. */
  constructor(
    transport: QuarkTransport,
    serviceName: string,
    defaultNamespace?: string,
    defaultIdentity?: string,
  ) {
    super(transport, serviceName);
    this.defaultNamespace = defaultNamespace;
    this.defaultIdentity = defaultIdentity;
  }

  /** Register a new workflow definition. Returns the created `Workflow`. */
  createWorkflow(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc(
      'CreateWorkflow',
      withDefaults(request, this.defaultNamespace, this.defaultIdentity),
      options,
    );
  }

  /** Fetch a workflow by ID. */
  getWorkflow(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc(
      'GetWorkflow',
      withDefaults(request, this.defaultNamespace, this.defaultIdentity),
      options,
    );
  }

  /** Page through workflows. */
  listWorkflows(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc(
      'ListWorkflows',
      withDefaults(request, this.defaultNamespace, this.defaultIdentity),
      options,
    );
  }

  /** Update a workflow's name/description. Returns the updated `Workflow`. */
  updateWorkflow(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc(
      'UpdateWorkflow',
      withDefaults(request, this.defaultNamespace, this.defaultIdentity),
      options,
    );
  }

  /** Delete a workflow by ID. */
  deleteWorkflow(
    request: unknown,
    options?: QuarkCallOptions,
  ): Promise<unknown> {
    return this.rpc(
      'DeleteWorkflow',
      withDefaults(request, this.defaultNamespace, this.defaultIdentity),
      options,
    );
  }

  /** Start a new run of a workflow (proxied to the external engine). */
  startRun(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc(
      'StartRun',
      withDefaults(request, this.defaultNamespace, this.defaultIdentity),
      options,
    );
  }

  /** Fetch a run by ID. */
  getRun(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc(
      'GetRun',
      withDefaults(request, this.defaultNamespace, this.defaultIdentity),
      options,
    );
  }

  /** Cancel a run (proxied to the external engine). */
  cancelRun(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc(
      'CancelRun',
      withDefaults(request, this.defaultNamespace, this.defaultIdentity),
      options,
    );
  }

  /** Page through runs of a workflow. */
  listRuns(request: unknown, options?: QuarkCallOptions): Promise<unknown> {
    return this.rpc(
      'ListRuns',
      withDefaults(request, this.defaultNamespace, this.defaultIdentity),
      options,
    );
  }
}

/**
 * Client for the Quarkloop workflow component.
 *
 * Holds one {@link QuarkTransport} bound to the workflow-service endpoint and
 * exposes the {@link WorkflowService}. The optional `namespace` and
 * `identity` defaults are merged into every request made through this client.
 */
export class WorkflowClient {
  private readonly transport: QuarkTransport;
  private readonly defaultNamespace?: string;
  private readonly defaultIdentity?: string;
  private _workflow?: WorkflowService;

  /** @internal Constructed by {@link QuarkClientBuilder.build}. */
  constructor(
    transport: QuarkTransport,
    defaultNamespace?: string,
    defaultIdentity?: string,
  ) {
    this.transport = transport;
    this.defaultNamespace = defaultNamespace;
    this.defaultIdentity = defaultIdentity;
  }

  /** The underlying transport (for advanced use). */
  get quarkTransport(): QuarkTransport {
    return this.transport;
  }

  /** The default namespace merged into every request, if set. */
  get namespace(): string | undefined {
    return this.defaultNamespace;
  }

  /** The default caller identity merged into every request, if set. */
  get identity(): string | undefined {
    return this.defaultIdentity;
  }

  /** `platform.workflow.v1.WorkflowService` (9 RPCs). */
  workflow(): WorkflowService {
    return (this._workflow ??= new WorkflowService(
      this.transport,
      'platform.workflow.v1.WorkflowService',
      this.defaultNamespace,
      this.defaultIdentity,
    ));
  }

  /** Release transport resources. */
  async close(): Promise<void> {
    await this.transport.close();
  }
}
