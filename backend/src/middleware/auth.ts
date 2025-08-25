import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config/config.js';
import { ApiError } from '../utils/errors.js';
import type { User } from '../types/api.js';

// Extend Express Request type to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, CONFIG.JWT_SECRET, (err, user) => {
      if (err) {
        return next(new ApiError(403, 'Invalid or expired token'));
      }
      
      req.user = user as User;
      next();
    });
  } else {
    next(new ApiError(401, 'Authentication required'));
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    next();
  };
};
