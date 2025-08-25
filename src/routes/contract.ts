// src/routes/contract.ts
import { Router } from 'express';
import { ContractController } from '../controllers/contract';

const router = Router();
const controller = new ContractController();

// Contract routes
router.get('/:id', controller.getContract);
router.post('/:id/otp/send', controller.sendOtp);
router.post('/:id/otp/verify', controller.verifyOtp);
router.post('/:id/consent', controller.submitConsent);
router.post('/:id/signature', controller.submitSignature);
router.post('/:id/finalize', controller.finalizeContract);
router.get('/:id/download', controller.downloadContract);
router.get('/:id/audit-logs', controller.getAuditLogs);

export const contractRouter = router;