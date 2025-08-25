// backend/src/types/contract.ts
export interface Contract {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'canceled';
  base_pdf_path: string;
  final_pdf_path?: string;
  pdf_sha256?: string;
  created_at: string;
  completed_at?: string;
}

export interface Signer {
  id: string;
  contract_id: string;
  name: string;
  email: string;
  phone?: string;
  sequence: number;
  otp_verified_at?: string;
  signed_at?: string;
  signature_image_path?: string;
  signature_page?: number;
  signature_x?: number;
  signature_y?: number;
  signature_width?: number;
  gps_lat?: number;
  gps_lng?: number;
  gps_accuracy?: number;
  consent_text?: string;
  consent_at?: string;
}

export interface AuditLog {
  id: string;
  contract_id: string | null;
  signer_id: string | null;
  event: string;
  meta_json: string;
  created_at: string;
}