/**
 * node-handle.ts — NodeHandle implementation.
 *
 * Single responsibility: provide run(), info(), validate() for a
 * specific node URI. Delegates all communication to Connection.
 */

import type { Connection } from "./connection.ts";
import { NodeExecutionError } from "./errors.ts";
import type {
  ExecuteResponse,
  NodeHandle,
  NodeInfo,
} from "./types.ts";

export class NodeHandleImpl<I = unknown, O = unknown> implements NodeHandle<I, O> {
  constructor(
    private readonly conn: Connection,
    private readonly uri: string,
    private inputValidator?: (input: unknown) => void | Promise<void>,
    private outputValidator?: (output: unknown) => void | Promise<void>,
  ) {}

  async run(input: I): Promise<O> {
    if (this.inputValidator) {
      await this.inputValidator(input);
    }

    const subject = `quark.node.${this.uri}.execute`;
    const resp = await this.conn.request<ExecuteResponse>(subject, { input });

    if (!resp.success) {
      throw new NodeExecutionError(this.uri, resp.error ?? "unknown error");
    }

    const output = resp.output as O;

    if (this.outputValidator) {
      await this.outputValidator(output);
    }

    return output;
  }

  async info(): Promise<NodeInfo> {
    return this.conn.request<NodeInfo>("quark.catalog.info", { uri: this.uri });
  }

  validate(
    inputValidator?: (input: unknown) => void | Promise<void>,
    outputValidator?: (output: unknown) => void | Promise<void>,
  ): NodeHandle<I, O> {
    return new NodeHandleImpl(
      this.conn,
      this.uri,
      inputValidator ?? this.inputValidator,
      outputValidator ?? this.outputValidator,
    );
  }
}
