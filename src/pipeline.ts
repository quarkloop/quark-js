/**
 * pipeline.ts — Pipeline builder for chained node execution.
 *
 * Single responsibility: chain node calls where each output feeds
 * the next input.
 */

import type { Connection } from "./connection.ts";
import { NodeExecutionError } from "./errors.ts";
import type { ExecuteResponse, PipelineBuilder } from "./types.ts";

interface Step {
  uri: string;
  partialInput?: Record<string, unknown>;
}

export class PipelineBuilderImpl implements PipelineBuilder {
  private readonly steps: Step[] = [];

  constructor(
    private readonly conn: Connection,
    uri: string,
    input: unknown,
  ) {
    this.steps.push({ uri, partialInput: input as Record<string, unknown> });
  }

  then(uri: string, partialInput?: Record<string, unknown>): PipelineBuilder {
    this.steps.push({ uri, partialInput });
    return this;
  }

  async execute(): Promise<unknown> {
    let current: unknown;

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];

      const input =
        i === 0
          ? step.partialInput
          : step.partialInput && typeof current === "object" && current !== null
            ? { ...current, ...step.partialInput }
            : step.partialInput ?? current;

      const subject = `quark.node.${step.uri}.execute`;
      const resp = await this.conn.request<ExecuteResponse>(subject, { input });

      if (!resp.success) {
        throw new NodeExecutionError(
          step.uri,
          `pipeline step ${i}: ${resp.error ?? "unknown error"}`,
        );
      }

      current = resp.output;
    }

    return current;
  }
}
