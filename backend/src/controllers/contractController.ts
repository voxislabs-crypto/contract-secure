import { Request, Response } from 'express';
import { ok, err, SuccessResponse, ErrorResponse } from '../utils/respond.js';

// Extend Express Request type to include our custom properties
declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}

// Define contract-related types
type ContractStatus = 'draft' | 'pending' | 'completed';

interface Contract {
  id: string;
  title: string;
  status: ContractStatus;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

// Helper to ensure consistent response types
const handleResponse = <T>(
  handler: (req: Request, res: Response) => Promise<Response<SuccessResponse<T>> | Response<ErrorResponse>>
) => {
  return async (req: Request, res: Response) => {
    try {
      return await handler(req, res);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Request error:', error);
      return err(res, 500, 'server_error', errorMessage, req.id || 'unknown');
    }
  };
};

export const getContract = handleResponse<{ contract: Contract }>(async (req, res) => {
  const { contractId } = req.params;
  
  // In a real implementation, you would fetch the contract from the database
  // const contract = await db.getContract(contractId);
  // if (!contract) {
  //   return err(res, 404, 'not_found', 'Contract not found', req.id!);
  // }
  
  // For now, return a mock response
  const contract: Contract = {
    id: contractId,
    title: 'Sample Contract',
    status: 'draft',
    createdAt: new Date().toISOString(),
  };
  
  return ok(res, { contract });
});

interface CreateContractBody {
  title: string;
  // Add other fields as needed
}

export const createContract = handleResponse<{ id: string }>(async (req, res) => {
  const { title } = req.body as CreateContractBody;
  
  if (!title) {
    return err(res, 400, 'bad_request', 'Title is required', req.id!);
  }
  
  // In a real implementation, you would save the contract to the database
  // const contractId = await db.createContract({ title });
  
  // For now, return a mock response
  const contractId = `contract_${Date.now()}`;
  
  return ok(res, { id: contractId });
});

interface FinalizeContractResponse {
  download: string;
  downloadUrl: string;
  sha256: string;
}

export const finalizeContract = handleResponse<FinalizeContractResponse>(async (req, res) => {
  const { contractId } = req.params;
  
  // In a real implementation, you would finalize the contract in the database
  // and generate the final PDF
  // await db.finalizeContract(contractId);
  
  // For now, return a mock response
  const response: FinalizeContractResponse = {
    download: `/api/contracts/${contractId}/download`,
    downloadUrl: `http://localhost:3001/api/contracts/${contractId}/download`,
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // empty string hash
  };
  
  return ok(res, response);
});
