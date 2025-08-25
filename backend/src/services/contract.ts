import path from 'path';
import fs from 'fs/promises';
import config from '../config/config.js';

// Define types for better type safety
interface Signer {
  id: string;
  status: 'pending' | 'verified' | 'consented' | 'signed';
  otp?: string;
  signatureData?: string;
  consent?: {
    text: string;
    timestamp: string;
    ipAddress: string;
  };
  position?: {
    page: number;
    x: number;
    y: number;
    width: number;
  };
  signature?: {
    data: string;
    timestamp: string;
    ipAddress: string;
  };
}

interface Contract {
  id: string;
  status: 'draft' | 'pending' | 'completed';
  signers: Record<string, Signer>;
  completedAt?: string;
  finalPdfPath?: string;
}

// Ensure upload directories exist
const ensureUploadDirs = async () => {
  try {
    await fs.mkdir(config.uploads.dir, { recursive: true });
    await fs.mkdir(config.uploads.signaturesDir, { recursive: true });
  } catch (error) {
    console.error('Error creating upload directories:', error);
    throw error;
  }
};

// Initialize directories
ensureUploadDirs().catch(console.error);

// In-memory storage for demo purposes
const contracts: Record<string, Contract> = {};

export const getContract = async (contractId: string, signerId: string): Promise<Contract> => {
  if (!contracts[contractId]) {
    const newContract: Contract = {
      id: contractId,
      status: 'draft',
      signers: {
        [signerId]: {
          id: signerId,
          status: 'pending',
          otp: '123456' // For demo only
        }
      }
    };
    contracts[contractId] = newContract;
  }
  return contracts[contractId];
};

export const verifyOtp = async (contractId: string, signerId: string, otp: string) => {
  const contract = contracts[contractId];
  if (!contract) {
    throw new Error('Contract not found');
  }
  
  const signer = contract.signers[signerId];
  if (!signer) {
    throw new Error('Signer not found');
  }

  if (otp !== signer.otp) {
    throw new Error('Invalid OTP');
  }

  signer.status = 'verified';
  return { success: true, message: 'OTP verified' };
};

interface LocationData {
  ip?: string;
  userAgent?: string;
  // Add other location-related fields as needed
}

export const submitConsent = async (
  contractId: string,
  signerId: string,
  consentText: string,
  location: LocationData
) => {
  const contract = contracts[contractId];
  if (!contract) {
    throw new Error('Contract not found');
  }

  const signer = contract.signers[signerId];
  if (!signer) {
    throw new Error('Signer not found');
  }

  // Update signer status to consented
  signer.status = 'consented';
  signer.consent = {
    text: consentText,
    timestamp: new Date().toISOString(),
    ipAddress: location.ip || 'unknown',
  };

  return { success: true, message: 'Consent recorded' };
};

export const submitSignature = async (
  contractId: string,
  signerId: string,
  signatureData: string,
  position: { page: number; x: number; y: number; width: number }
) => {
  const contract = contracts[contractId];
  if (!contract) {
    throw new Error('Contract not found');
  }

  const signer = contract.signers[signerId];
  if (!signer) {
    throw new Error('Signer not found');
  }

  signer.signature = {
    data: signatureData,
    timestamp: new Date().toISOString(),
    ipAddress: '', // You might want to capture the IP address here
  };
  signer.position = position;
  signer.status = 'signed';

  return { success: true, message: 'Signature recorded' };
};

export const finalizeContract = async (contractId: string) => {
  const contract = contracts[contractId];
  if (!contract) {
    throw new Error('Contract not found');
  }
  
  // Verify all signers have signed
  const allSigned = Object.values(contract.signers).every(
    (signer) => signer.status === 'signed'
  );
  
  if (!allSigned) {
    throw new Error('Not all signers have signed the contract');
  }
  
  // Generate final PDF path
  const finalPdfName = `${contractId}_final.pdf`;
  const finalPdfPath = path.join(config.uploads.dir, finalPdfName);
  
  // In a real app, you would:
  // 1. Merge the original PDF with all signatures
  // 2. Apply any watermarks or final touches
  // 3. Save the final PDF
  
  // For demo purposes, we'll just create a placeholder file
  try {
    await fs.writeFile(finalPdfPath, 'FINAL_CONTRACT_PLACEHOLDER');
  } catch (error) {
    console.error('Error saving final contract:', error);
    throw new Error('Failed to generate final contract');
  }
  
  // Update contract status
  contract.status = 'completed';
  contract.completedAt = new Date().toISOString();
  contract.finalPdfPath = finalPdfPath;
  
  return {
    ...contract,
    downloadUrl: `/api/contracts/${contractId}/download`
  };
};
