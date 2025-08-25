-- contracts: one row per contract (base PDF -> final PDF)
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | in_progress | completed | canceled
  base_pdf_path TEXT NOT NULL,
  final_pdf_path TEXT,
  pdf_sha256 TEXT,              -- of final PDF for integrity
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

-- signers: each person who must sign, in sequence (or parallel if you add it later)
CREATE TABLE IF NOT EXISTS signers (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  sequence INTEGER NOT NULL DEFAULT 1,  -- 1,2,3...
  otp_hash TEXT,                        -- bcrypt
  otp_expires_at TEXT,
  otp_verified_at TEXT,
  signed_at TEXT,
  signature_image_path TEXT,            -- saved PNG of signature strokes
  signature_page INTEGER,               -- which PDF page (0-index)
  signature_x REAL,
  signature_y REAL,
  signature_width REAL,
  gps_lat REAL,
  gps_lng REAL,
  gps_accuracy REAL,
  consent_text TEXT,
  consent_at TEXT,
  FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

-- audit: append-only event trail
CREATE TABLE IF NOT EXISTS audit (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  signer_id TEXT,                       -- nullable for system events
  event TEXT NOT NULL,                  -- CREATED, OTP_SENT, OTP_VERIFIED, CONSENT_GIVEN, SIGNATURE_SAVED, PDF_FINALIZED, DOWNLOADED, etc.
  meta_json TEXT,                       -- store IP, UA, geo, errors
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_signers_contract_id ON signers(contract_id);
CREATE INDEX IF NOT EXISTS idx_audit_contract_id ON audit(contract_id);
CREATE INDEX IF NOT EXISTS idx_audit_signer_id ON audit(signer_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit(created_at);
