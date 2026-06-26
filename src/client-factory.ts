/** Factory for createClient(). */

import { QuarkClientImpl } from "./client.ts";
import type { QuarkClient, QuarkClientOptions, QuarkSchema } from "./types.ts";

export async function createClient<S extends QuarkSchema = QuarkSchema>(
  opts: QuarkClientOptions,
): Promise<QuarkClient<S>> {
  const client = new QuarkClientImpl<S>(opts);
  await client.connect();
  return client as unknown as QuarkClient<S>;
}
