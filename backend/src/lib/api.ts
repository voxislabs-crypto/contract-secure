// backend/src/lib/api.ts
import axios, { AxiosInstance } from 'axios';
import { Contract, AuditLog } from '../types/contract.js';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('signingToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('signingToken');
          window.location.href = '/signin';
        }
        return Promise.reject(error);
      }
    );
  }

  // Contract methods
  async getContract(contractId: string): Promise<Contract> {
    return this.client.get(`/contracts/${contractId}`);
  }

  async verifyOtp(contractId: string, signerId: string, code: string): Promise<{ token: string }> {
    return this.client.post(`/contracts/${contractId}/otp/verify`, { signerId, code });
  }

  async submitConsent(
    contractId: string,
    signerId: string,
    data: { consentText: string; gps?: { lat: number; lng: number; accuracy: number } }
  ) {
    return this.client.post(`/contracts/${contractId}/consent`, { signerId, ...data });
  }

  async submitSignature(
    contractId: string,
    signerId: string,
    data: { dataUrlPng: string; page: number; x: number; y: number; width: number }
  ) {
    return this.client.post(`/contracts/${contractId}/signature`, { signerId, ...data });
  }

  async finalizeContract(contractId: string) {
    return this.client.post(`/contracts/${contractId}/finalize`);
  }

  async downloadContract(contractId: string): Promise<Blob> {
    const response = await this.client.get(`/contracts/${contractId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async getAuditLogs(contractId: string): Promise<AuditLog[]> {
    return this.client.get(`/contracts/${contractId}/audit-logs`);
  }
}

export const api = new ApiClient();