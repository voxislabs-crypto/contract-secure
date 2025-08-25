export interface ErrorResponse {
  ok: false;
  error: string;
  message: string;
  requestId?: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

export interface SuccessResponse<T = unknown> {
  ok: true;
  data: T;
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface ContractStatus {
  status: 'draft' | 'pending' | 'partially_signed' | 'executed' | 'void';
}

export interface ContractSummary extends ContractStatus {
  id: string;
  title: string;
  created_at?: string;
}

export interface Contract extends ContractSummary {
  base_pdf_path?: string | null;
  final_pdf_path?: string | null;
  pdf_sha256?: string | null;
}

export interface Signer {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  status: 'pending' | 'sent' | 'viewed' | 'signed' | 'declined';
  sequence: number;
  otp_verified: boolean;
  signed_at?: string | null;
  signature_image?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  gps_accuracy?: number | null;
  consented: boolean;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface InviteResponse {
  ok: boolean;
  link: string;
  token: string;
}

export interface OtpStartRequest {
  contractId: string;
  signerId: string;
  email: string;
}

export interface OtpVerifyRequest {
  contractId: string;
  signerId: string;
  code: string;
}

export interface SignRequest {
  signatureDataUrl: string;
  gps?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  consented: boolean;
  ua?: string;
}

export interface FinalizeResponse {
  ok: boolean;
  download: string;
  downloadUrl: string;
  sha256: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLog {
  id: number;
  contract_id: string;
  signer_id: string | null;
  event: string;
  payload_json: Record<string, unknown>;
  created_at: string;
}

export interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  created_at: string;
  updated_at: string;
}
