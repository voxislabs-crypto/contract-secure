// src/services/contract.ts
import { Contract, Signer, AuditLog } from '../types/contract';
import { v4 as uuidv4 } from 'uuid';
import { sign } from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';

export class ContractService {
  // In a real app, replace these with database calls
  private contracts: Record<string, Contract> = {};
  private signers: Record<string, Signer> = {};
  private auditLogs: Record<string, AuditLog> = {};

  async getContract(contractId: string): Promise<Contract> {
    const contract = this.contracts[contractId];
    if (!contract) {
      throw new Error('Contract not found');
    }
    return contract;
  }

  async sendOtp(contractId: string, signerId: string): Promise<void> {
    // In a real app, send OTP via email/SMS
    console.log(`OTP sent to signer ${signerId} for contract ${contractId}`);
    // Mock OTP: 123456
  }

  async verifyOtp(contractId: string, signerId: string, code: string): Promise<string> {
    // In a real app, verify the OTP
    if (code !== '123456') {
      throw new Error('Invalid OTP');
    }

    // Generate JWT token
    const token = sign(
      { contractId, signerId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    return token;
  }

  async submitConsent(
    contractId: string,
    signerId: string,
    data: { consentText: string; gps?: { lat: number; lng: number; accuracy: number } }
  ): Promise<void> {
    const signer = this.signers[signerId];
    if (!signer) {
      throw new Error('Signer not found');
    }

    signer.consent_text = data.consentText;
    signer.consent_at = new Date().toISOString();

    if (data.gps) {
      signer.gps_lat = data.gps.lat;
      signer.gps_lng = data.gps.lng;
      signer.gps_accuracy = data.gps.accuracy;
    }

    this.auditLog(signer.contract_id, signerId, 'consent_given', {
      ...data,
      gps: data.gps ? 'with_gps' : 'without_gps',
    });
  }

  async submitSignature(
    contractId: string,
    signerId: string,
    data: { dataUrlPng: string; page: number; x: number; y: number; width: number }
  ): Promise<void> {
    const signer = this.signers[signerId];
    if (!signer) {
      throw new Error('Signer not found');
    }

    // In a real app, save the signature image to disk/S3
    const signatureId = uuidv4();
    const signaturePath = `./uploads/signatures/${signatureId}.png`;

    // Create directory if it doesn't exist
    await fs.mkdir(path.dirname(signaturePath), { recursive: true });

    // Save the signature image
    const base64Data = data.dataUrlPng.replace(/^data:image\/png;base64,/, '');
    await fs.writeFile(signaturePath, base64Data, 'base64');

    // Update signer
    signer.signature_image_path = signaturePath;
    signer.signature_page = data.page;
    signer.signature_x = data.x;
    signer.signature_y = data.y;
    signer.signature_width = data.width;
    signer.signed_at = new Date().toISOString();

    this.auditLog(signer.contract_id, signerId, 'signature_submitted', {
      signatureId,
      page: data.page,
    });
  }

  async finalizeContract(contractId: string): Promise<void> {
    const contract = this.contracts[contractId];
    if (!contract) {
      throw new Error('Contract not found');
    }

    // In a real app, generate final PDF with all signatures
    contract.status = 'completed';
    contract.completed_at = new Date().toISOString();

    this.auditLog(contractId, null, 'contract_finalized', {});
  }

  async downloadContract(contractId: string): Promise<Buffer> {
    const contract = this.contracts[contractId];
    if (!contract) {
      throw new Error('Contract not found');
    }

    // In a real app, generate and return the final PDF
    // For now, return a mock PDF
    return Buffer.from('Mock PDF content');
  }

  async getAuditLogs(contractId: string): Promise<AuditLog[]> {
    return Object.values(this.auditLogs).filter(log =>
      log.contract_id === contractId
    );
  }

  private auditLog(
    contractId: string | null,
    signerId: string | null,
    event: string,
    meta: Record<string, any>
  ): void {
    const log: AuditLog = {
      id: uuidv4(),
      contract_id: contractId,
      signer_id: signerId,
      event,
      meta_json: JSON.stringify(meta),
      created_at: new Date().toISOString(),
    };

    this.auditLogs[log.id] = log;
  }
}