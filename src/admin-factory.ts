/** Factory for createAdminClient(). */

import { QuarkAdminClientImpl } from "./admin-client.ts";
import type { QuarkAdminClient, QuarkClientOptions } from "./types.ts";

export async function createAdminClient(
  opts: QuarkClientOptions,
): Promise<QuarkAdminClient> {
  const client = new QuarkAdminClientImpl(opts);
  await client.connect();
  return client;
}
