import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request type to include the id property
declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}

// Define a type for the error details
interface ErrorDetails {
  [key: string]: unknown;
  type?: string;
  code?: string;
  field?: string;
  value?: unknown;
}



export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    
    // This is needed for TypeScript when extending built-in classes
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message = 'Bad request', details?: ErrorDetails) {
    return new ApiError(400, message, 'bad_request', details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message, 'unauthorized');
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message, 'forbidden');
  }

  static notFound(message = 'Not found') {
    return new ApiError(404, message, 'not_found');
  }

  static internal(message = 'Internal server error', details?: ErrorDetails) {
    return new ApiError(500, message, 'internal_error', details);
  }
}

// Type guard for JWT errors
export function isJwtError(error: unknown): error is Error {
  return error instanceof Error && 
    (error.name === 'JsonWebTokenError' || 
     error.name === 'TokenExpiredError' || 
     error.name === 'NotBeforeError');
}

// Map SQLite errors to appropriate API errors
export function mapSqliteError(error: unknown): ApiError | null {
  if (!(error instanceof Error)) {
    return null;
  }
  
  const sqliteError = error as NodeJS.ErrnoException;
  
  if (!sqliteError.code) return null;

  switch (sqliteError.code) {
    case 'SQLITE_CONSTRAINT':
      if (sqliteError.message.includes('FOREIGN KEY')) {
        return ApiError.badRequest('Foreign key constraint violation', { 
          constraint: sqliteError.message 
        });
      } else if (sqliteError.message.includes('UNIQUE')) {
        return ApiError.badRequest('Unique constraint violation', { 
          constraint: sqliteError.message 
        });
      } else {
        return ApiError.badRequest('Database constraint violation', { 
          constraint: sqliteError.message 
        });
      }
    case 'SQLITE_BUSY':
      return new ApiError(503, 'Database is busy, please try again', 'database_busy');
    case 'SQLITE_ERROR':
      return ApiError.internal('Database error', { 
        message: sqliteError.message 
      });
    case 'SQLITE_READONLY':
      return ApiError.internal('Database is read-only', { 
        message: sqliteError.message 
      });
    default:
      return null;
  }
}

// Error response interface
export interface ErrorResponse {
  ok: false;
  error: string;
  message: string;
  requestId: string;
  details?: unknown;
  stack?: string;
}

// Success response interface
export interface SuccessResponse<T = unknown> {
  ok: true;
  data: T;
  requestId: string;
}

// Create error handler middleware
export function createErrorHandler() {
  return (
    error: unknown,
    req: Request,
    res: Response<ErrorResponse>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction
  ): void | Response<ErrorResponse> => {
    const requestId = req.id || 'unknown';
    const isDev = process.env.NODE_ENV !== 'production';

    console.error('Error handler caught:', error);

    // Handle ApiError instances
    if (error instanceof ApiError) {
      return sendErrorResponse(res, error, requestId, isDev);
    }

    // Handle OpenAPI validation errors
    const openApiError = error as { status?: number; errors?: unknown[]; name?: string; message?: string };
    if (openApiError.status && openApiError.status >= 400 && openApiError.errors) {
      return res.status(openApiError.status).json({
        ok: false,
        error: openApiError.name || 'validation_error',
        message: openApiError.message || 'Validation error',
        requestId,
        ...(isDev && { details: openApiError.errors })
      });
    }

    // Handle validation errors
    const validationError = error as SyntaxError & { status?: number; body?: unknown };
    if (validationError instanceof SyntaxError && validationError.status === 400 && 'body' in validationError) {
      return sendErrorResponse(
        res,
        ApiError.badRequest('Invalid JSON payload', { type: 'invalid_json' }),
        requestId,
        isDev
      );
    }

    // Handle JWT errors
    const jwtError = error as { name?: string; message?: string };
    if (jwtError.name === 'JsonWebTokenError' || jwtError.name === 'TokenExpiredError') {
      return sendErrorResponse(
        res,
        ApiError.unauthorized('Invalid or expired token'),
        requestId,
        isDev
      );
    }

    // Handle database errors
    const dbError = mapSqliteError(error);
    if (dbError) {
      return sendErrorResponse(res, dbError, requestId, isDev);
    }

    // Handle other errors
    const otherError = error as Error & { statusCode?: number; status?: number; code?: string; details?: ErrorDetails };
    const statusCode = otherError.statusCode || otherError.status || 500;
    const message = isDev ? otherError.message : 'Something went wrong';
    const errorCode = otherError.code || 'internal_error';
    
    return sendErrorResponse(
      res,
      new ApiError(statusCode, message, errorCode, isDev ? otherError.details : undefined),
      requestId,
      isDev
    );
  };
}

// Helper to send error response
function sendErrorResponse(
  res: Response,
  error: ApiError,
  requestId: string,
  isDev: boolean
): Response<ErrorResponse> {
  const status = error.status || 500;
  const response: ErrorResponse = {
    ok: false,
    error: error.code || 'internal_error',
    message: error.message || 'An unexpected error occurred',
    requestId,
  };

  // Add error details in development or if explicitly provided
  if ((isDev || error.details) && error.details) {
    response.details = error.details;
  }

  // Include stack trace in development
  if (isDev && error.stack) {
    response.stack = error.stack;
  }

  // Log the error
  console.error(`[${requestId}] ${error.code || 'ERROR'}: ${error.message}`);
  if (error.details) {
    console.error('Error details:', error.details);
  }
  if (isDev && error.stack) {
    console.error(error.stack);
  }

  return res.status(status).json(response);
}

// Helper to send success response
export function sendSuccessResponse<T>(
  res: Response,
  data: T,
  requestId: string,
  statusCode = 200
) {
  const response: SuccessResponse<T> = {
    ok: true,
    data,
    requestId,
  };
  
  return res.status(statusCode).json(response);
}

// Request ID middleware
export function requestIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = uuidv4();
    req.id = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  };
}
