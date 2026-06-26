/**
 * admin-client.ts — QuarkAdminClient implementation.
 *
 * Single responsibility: admin-level operations.
 * Push, delete, list, search, info, pull, health, status, flushCache.
 */

import { Connection } from "./connection.ts";
import { NotImplementedError } from "./errors.ts";
import type {
  CatalogListResponse,
  HealthStatus,
  NodeInfo,
  NodePackage,
  PushNodeRequest,
  QuarkAdminClient,
  QuarkClientOptions,
  RuntimeStatus,
} from "./types.ts";

export class QuarkAdminClientImpl implements QuarkAdminClient {
  private readonly conn: Connection;

  constructor(opts: QuarkClientOptions) {
    this.conn = new Connection(opts);
  }

  async connect(): Promise<void> {
    await this.conn.connect();
  }

  async close(): Promise<void> {
    await this.conn.close();
  }

  async push(_uri: string, _pkg: PushNodeRequest): Promise<void> {
    // Planned: requires runtime support for quark.catalog.push subject.
    throw new NotImplementedError("admin.push()");
  }

  async delete(_uri: string): Promise<void> {
    // Planned: requires runtime support for quark.catalog.delete subject.
    throw new NotImplementedError("admin.delete()");
  }

  async list(prefix?: string): Promise<NodeInfo[]> {
    const resp = await this.conn.request<CatalogListResponse>(
      "quark.catalog.list",
      { prefix: prefix ?? "" },
    );
    return resp.nodes ?? [];
  }

  async search(keyword: string): Promise<NodeInfo[]> {
    const resp = await this.conn.request<CatalogListResponse>(
      "quark.catalog.search",
      { keyword },
    );
    return resp.nodes ?? [];
  }

  async info(uri: string): Promise<NodeInfo> {
    return this.conn.request<NodeInfo>("quark.catalog.info", { uri });
  }

  async pull(_uri: string): Promise<NodePackage> {
    // Planned: requires runtime support for quark.catalog.pull subject.
    throw new NotImplementedError("admin.pull()");
  }

  async health(): Promise<HealthStatus> {
    return this.conn.request<HealthStatus>("quark.runtime.health", {});
  }

  async status(): Promise<RuntimeStatus> {
    return this.conn.request<RuntimeStatus>("quark.runtime.status", {});
  }

  async flushCache(_uri?: string): Promise<void> {
    // Planned: requires runtime support for quark.runtime.cache.flush subject.
    throw new NotImplementedError("admin.flushCache()");
  }
}
