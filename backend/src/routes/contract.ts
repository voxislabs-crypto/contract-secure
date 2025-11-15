import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  getContract,
  createContract,
  finalizeContract,
} from '../controllers/contractController.js';
import { ApiError } from '../utils/apiError.js';
import { err } from '../utils/respond.js';

// Import the module augmentation for Express types
import '../types/express.d.mjs';

const router = Router();

// Middleware to validate contractId
const validateContractId = (req: Request, res: Response, next: NextFunction) => {
  const { contractId } = req.params;

  if (!contractId) {
    return err(res, 400, 'bad_request', 'Contract ID is required', req.id!);
  }

  next();
};

// Error handling middleware
const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ApiError) {
    return err(res, error.status, error.code || 'api_error', error.message, req.id!, error.details);
  }

  console.error('Unhandled error:', error);
  return err(res, 500, 'server_error', 'Internal server error', req.id!);
};

// Apply error handler middleware
router.use(errorHandler);

/**
 * @openapi
 * /api/contracts:
 *   post:
 *     summary: Create a new contract
 *     tags: [Contracts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contract created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 id:
 *                   type: string
 *                   example: contract_1234567890
 */
router.post('/', async (req: Request, res: Response) => {
  await createContract(req, res);
});

/**
 * @openapi
 * /api/contracts/{contractId}:
 *   get:
 *     summary: Get contract details
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contract details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 contract:
 *                   $ref: '#/components/schemas/Contract'
 */
router.get('/:contractId', validateContractId, async (req: Request, res: Response) => {
  await getContract(req, res);
});

/**
 * @openapi
 * /api/contracts/{contractId}/finalize:
 *   post:
 *     summary: Finalize a contract
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contract finalized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 download:
 *                   type: string
 *                   example: /api/contracts/123/download
 *                 downloadUrl:
 *                   type: string
 *                   example: /api/contracts/123/download
 *                 sha256:
 *                   type: string
 *                   example: a1b2c3d4e5f6...
 */
router.post('/:contractId/finalize', validateContractId, async (req: Request, res: Response) => {
  await finalizeContract(req, res);
});

export default router;

// Contract interface for TypeScript
export interface Contract {
  id: string;
  title: string;
  status: 'draft' | 'pending' | 'signed' | 'finalized';
  createdAt: string;
  updatedAt?: string;
}
