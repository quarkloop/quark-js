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

export class NodeExecutionError extends QuarkError {
  constructor(uri: string, message: string) {
    super(`Node "${uri}" failed: ${message}`, "NODE_EXECUTION_ERROR");
    this.name = "NodeExecutionError";
  }
}

export class ValidationError extends QuarkError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}
