/**
 * connection.ts — NATS connection management.
 *
 * Single responsibility: connect to NATS, provide typed request-reply
 * and publish helpers, manage connection lifecycle.
 *
 * Uses @nats-io/transport-node (the official v3 NATS client — not the
 * deprecated `nats` package).
 */

import { connect, type NatsConnection } from "@nats-io/transport-node";
import type { QuarkClientOptions } from "./types.ts";

export class Connection {
  private nc: NatsConnection | null = null;
  private readonly opts: QuarkClientOptions;

  constructor(opts: QuarkClientOptions) {
    this.opts = opts;
  }

  async connect(): Promise<void> {
    this.nc = await connect({
      servers: this.opts.servers,
      timeout: this.opts.timeout ?? 5000,
    });
  }

  async close(): Promise<void> {
    if (this.nc) {
      await this.nc.drain();
      this.nc = null;
    }
  }

  private conn(): NatsConnection {
    if (!this.nc) throw new Error("Not connected. Call connect() first.");
    return this.nc;
  }

  /** Request-reply: send JSON, receive JSON. */
  async request<T = unknown>(subject: string, payload: unknown): Promise<T> {
    const nc = this.conn();
    const data = JSON.stringify(payload);
    const msg = await nc.request(subject, data, {
      timeout: this.opts.requestTimeout ?? 30000,
    });
    return msg.json<T>();
  }

  /** Publish with reply-to (for stream initiation). */
  async publishWithReply(
    subject: string,
    replyTo: string,
    payload: unknown,
  ): Promise<void> {
    const nc = this.conn();
    nc.publish(subject, JSON.stringify(payload), { reply: replyTo });
  }

  /** Subscribe to a subject. Returns an async iterable. */
  subscribe(subject: string) {
    return this.conn().subscribe(subject);
  }

  /** Create a unique inbox for replies. */
  createInbox(): string {
    return this.conn().createInbox();
  }
}
