/**
 * errors.ts — Error types for the Quark client.
 *
 * Single responsibility: define error classes.
 */

export class QuarkError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "QuarkError";
  }
}
