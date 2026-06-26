/**
 * client.ts — QuarkClient implementation.
 *
 * Single responsibility: application-level operations.
 * Execute nodes, batch, pipeline, read catalog.
 */

import { Connection } from "./connection.ts";
import { NotImplementedError } from "./errors.ts";
import { NodeHandleImpl } from "./node-handle.ts";
import { PipelineBuilderImpl } from "./pipeline.ts";
import type {
  CatalogListResponse,
  NodeHandle,
  NodeInfo,
  NodePackage,
  PipelineBuilder,
  QuarkClient,
  QuarkClientOptions,
  QuarkSchema,
} from "./types.ts";

export class QuarkClientImpl<S extends QuarkSchema = QuarkSchema>
  implements QuarkClient<S>
{
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

  node(uri: string): NodeHandle {
    return new NodeHandleImpl(this.conn, uri);
  }

  async run(uri: string, input: unknown): Promise<unknown> {
    return this.node(uri).run(input);
  }

  async batch(calls: Array<[string, unknown]>): Promise<unknown[]> {
    return Promise.all(calls.map(([uri, input]) => this.run(uri, input)));
  }

  pipeline(uri: string, input: unknown): PipelineBuilder {
    return new PipelineBuilderImpl(this.conn, uri, input);
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

  async pull(_uri: string): Promise<NodePackage> {
    // Planned: requires runtime support for quark.catalog.pull subject.
    throw new NotImplementedError("client.pull()");
  }
}
