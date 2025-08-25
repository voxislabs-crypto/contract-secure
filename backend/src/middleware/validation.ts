import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError.js';

// Extend the Express Request type to include the id property
declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}

/**
 * Middleware to handle OpenAPI validation errors
 */
interface OpenApiError extends Error {
  status: number;
  errors?: unknown[];
  [key: string]: unknown;
}

export function openApiErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Handle OpenAPI validation errors
  const error = err as OpenApiError;
  if (error.status && error.status >= 400 && error.errors) {
    const isDev = process.env.NODE_ENV !== 'production';
    const requestId = req.id || 'unknown';

    return res.status(error.status).json({
      ok: false,
      error: error.name || 'validation_error',
      message: error.message || 'Validation error',
      requestId,
      ...(isDev && { details: error.errors })
    });
  }

  next(err);
}

/**
 * Middleware to validate request body against a schema
 * @param validate Function that validates the request body
 */
export function validateRequest<T = unknown>(
  validate: (data: T) => { valid: boolean; error?: string }
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { valid, error } = validate(req.body);
    
    if (!valid) {
      throw ApiError.badRequest(error || 'Invalid request data');
    }
    
    next();
  };
}
