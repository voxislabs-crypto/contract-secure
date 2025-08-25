// src/controllers/contract.ts
import { Request, Response } from 'express';
import { ContractService } from '../services/contract';

export class ContractController {
  private contractService: ContractService;

  constructor() {
    this.contractService = new ContractService();
  }

  getContract = async (req: Request, res: Response) => {
    try {
      const contract = await this.contractService.getContract(req.params.id);
      res.json(contract);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch contract' });
    }
  };

  sendOtp = async (req: Request, res: Response) => {
    try {
      const { signerId } = req.body;
      await this.contractService.sendOtp(req.params.id, signerId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: 'Failed to send OTP' });
    }
  };

  verifyOtp = async (req: Request, res: Response) => {
    try {
      const { signerId, code } = req.body;
      const token = await this.contractService.verifyOtp(req.params.id, signerId, code);
      res.json({ token });
    } catch (error) {
      res.status(400).json({ error: 'Invalid OTP' });
    }
  };

  submitConsent = async (req: Request, res: Response) => {
    try {
      const { signerId, consentText, gps } = req.body;
      await this.contractService.submitConsent(req.params.id, signerId, { consentText, gps });
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: 'Failed to submit consent' });
    }
  };

  submitSignature = async (req: Request, res: Response) => {
    try {
      const { signerId, dataUrlPng, page, x, y, width } = req.body;
      await this.contractService.submitSignature(req.params.id, signerId, {
        dataUrlPng,
        page,
        x,
        y,
        width,
      });
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: 'Failed to submit signature' });
    }
  };

  finalizeContract = async (req: Request, res: Response) => {
    try {
      await this.contractService.finalizeContract(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: 'Failed to finalize contract' });
    }
  };

  downloadContract = async (req: Request, res: Response) => {
    try {
      const pdfBuffer = await this.contractService.downloadContract(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=contract-${req.params.id}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(404).json({ error: 'Contract not found' });
    }
  };

  getAuditLogs = async (req: Request, res: Response) => {
    try {
      const logs = await this.contractService.getAuditLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  };
}