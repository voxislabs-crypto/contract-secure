const API_BASE = 'http://localhost:3001/api';

export interface Contract {
  id: string;
  title: string;
  status: 'draft' | 'pending' | 'pending_finalization' | 'executed';
  createdAt: string;
  totalSigners: number;
  signedCount: number;
  sha256?: string;
  signers?: Signer[];
}

export interface Signer {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'signed';
  signedAt?: string;
  gpsAccuracy?: number;
}

export interface SigningData {
  contract: {
    id: string;
    title: string;
    status: string;
  };
  signer: {
    id: string;
    name: string;
    email: string;
    otpVerified: boolean;
    signed: boolean;
  };
}

class ApiService {
  async createContract(title: string, pdfFile?: File): Promise<Contract> {
    const formData = new FormData();
    formData.append('title', title);
    if (pdfFile) {
      formData.append('pdf', pdfFile);
    }

    const response = await fetch(`${API_BASE}/contracts`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to create contract');
    }

    return response.json();
  }

  async addSigners(contractId: string, signers: Array<{name: string, email: string, phone?: string}>): Promise<void> {
    const response = await fetch(`${API_BASE}/contracts/${contractId}/signers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signers }),
    });

    if (!response.ok) {
      throw new Error('Failed to add signers');
    }
  }

  async generateInviteLink(contractId: string, signerId: string): Promise<string> {
    const response = await fetch(`${API_BASE}/contracts/${contractId}/invite/${signerId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to generate invite link');
    }

    const data = await response.json();
    return data.inviteLink;
  }

  async getContracts(): Promise<Contract[]> {
    const response = await fetch(`${API_BASE}/contracts`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch contracts');
    }

    return response.json();
  }

  async getContract(id: string): Promise<Contract> {
    const response = await fetch(`${API_BASE}/contracts/${id}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch contract');
    }

    return response.json();
  }

  async getSigningData(token: string): Promise<SigningData> {
    const response = await fetch(`${API_BASE}/sign/${token}`);
    
    if (!response.ok) {
      throw new Error('Invalid or expired signing link');
    }

    return response.json();
  }

  async startOTP(token: string): Promise<void> {
    const response = await fetch(`${API_BASE}/sign/otp/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error('Failed to send OTP');
    }
  }

  async verifyOTP(token: string, code: string): Promise<boolean> {
    const response = await fetch(`${API_BASE}/sign/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'OTP verification failed');
    }

    const data = await response.json();
    return data.verified;
  }

  async submitSignature(token: string, signatureDataUrl: string, gps: any, consent: boolean): Promise<{allSigned: boolean}> {
    const response = await fetch(`${API_BASE}/sign/${token}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signatureDataUrl, gps, consent }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit signature');
    }

    return response.json();
  }

  async finalizeContract(contractId: string): Promise<{sha256: string, downloadUrl: string}> {
    const response = await fetch(`${API_BASE}/contracts/${contractId}/finalize`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to finalize contract');
    }

    return response.json();
  }

  getDownloadUrl(contractId: string): string {
    return `${API_BASE}/contracts/${contractId}/download`;
  }
}

export const apiService = new ApiService();