import { Request } from 'express';
import { ApiError, createErrorHandler, requestIdMiddleware } from '../utils/apiError.js';

export { requestIdMiddleware };

export const errorHandler = createErrorHandler();

export const notFoundHandler = (req: Request): void => {
  throw new ApiError(404, `Can't find ${req.originalUrl} on this server!`, 'not_found');
};
