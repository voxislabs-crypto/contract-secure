import { Response, Request, NextFunction } from 'express';
import { SuccessResponse } from './apiError.js';

/**
 * Sends a standardized success response
 * @param res Express Response object
 * @param data The data to send in the response
 * @param requestId The request ID for tracking
 * @param statusCode HTTP status code (default: 200)
 */
export function sendSuccessResponse<T>(
  res: Response,
  data: T,
  requestId: string,
  statusCode = 200
): Response<SuccessResponse<T>> {
  const response: SuccessResponse<T> = {
    ok: true,
    data,
    requestId,
  };
  
  return res.status(statusCode).json(response);
}

/**
 * Creates a middleware that adds response methods to the Response object
 */
// Extend the Express Response type
declare module 'express-serve-static-core' {
  interface Response {
    sendSuccess: <T = unknown>(data: T, statusCode?: number) => Response<SuccessResponse<T>>;
  }
}

export function responseHelpersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Add sendSuccess method to response object
  const response = res as Response & {
    sendSuccess: <T = unknown>(data: T, statusCode?: number) => Response<SuccessResponse<T>>;
  };
  
  response.sendSuccess = function<T = unknown>(this: Response, data: T, statusCode = 200) {
    const request = req as Request & { id?: string };
    return sendSuccessResponse<T>(this, data, request.id || 'unknown', statusCode);
  };

  next();
}
