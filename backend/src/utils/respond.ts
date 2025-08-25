import { Response } from 'express';

export interface SuccessResponse<T = unknown> {
  ok: true;
  data?: T;
  [key: string]: unknown;
}

export interface ErrorResponse {
  ok: false;
  error: string;
  message: string;
  requestId: string;
  details?: unknown;
  stack?: string;
}

export function ok<T>(res: Response, data?: T): Response<SuccessResponse<T>> {
  return res.status(200).json({ ok: true, ...(data ? { data } : {}) });
}

export function err(
  res: Response,
  status: number,
  error: string,
  message: string,
  requestId: string,
  details?: unknown,
  stack?: string
): Response<ErrorResponse> {
  const response: ErrorResponse = {
    ok: false,
    error,
    message,
    requestId,
  };

  if (details) {
    response.details = details;
  }

  if (stack) {
    response.stack = stack;
  }

  return res.status(status).json(response);
}
