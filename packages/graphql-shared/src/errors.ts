export enum ErrorCode {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TENANT_ISOLATION_VIOLATION = 'TENANT_ISOLATION_VIOLATION',
}

export interface GraphQLErrorExtensions {
  code: ErrorCode;
  details?: Record<string, unknown>;
  timestamp?: string;
}

export class GraphQLCustomError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GraphQLCustomError';
  }

  toExtensions(): GraphQLErrorExtensions {
    return {
      code: this.code,
      details: this.details,
      timestamp: new Date().toISOString(),
    };
  }
}
