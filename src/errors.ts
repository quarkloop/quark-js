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

export class CatalogError extends QuarkError {
  constructor(message: string) {
    super(message, "CATALOG_ERROR");
    this.name = "CatalogError";
  }
}

export class ConnectionError extends QuarkError {
  constructor(message: string) {
    super(message, "CONNECTION_ERROR");
    this.name = "ConnectionError";
  }
}

export class NotImplementedError extends QuarkError {
  constructor(method: string) {
    super(
      `${method} is not yet implemented. The runtime currently supports: execute, catalog.list, catalog.search, catalog.info, runtime.health, runtime.status.`,
      "NOT_IMPLEMENTED",
    );
    this.name = "NotImplementedError";
  }
}
