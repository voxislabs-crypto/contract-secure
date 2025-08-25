// src/routes/api.ts
import { Router } from 'express';
import { contractRouter } from './contract';

export const apiRouter = Router();

// API routes
apiRouter.use('/contracts', contractRouter);