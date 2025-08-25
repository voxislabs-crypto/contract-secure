-- contracts
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  title TEXT,
  status TEXT DEFAULT 'pending',
  base_pdf_path TEXT,
  final_pdf_path TEXT,
  pdf_sha256 TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- signers
CREATE TABLE IF NOT EXISTS signers (
  id TEXT PRIMARY KEY,
  contract_id TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  sequence INTEGER,
  otp_hash TEXT,
  otp_expires_at TEXT,
  otp_verified_at TEXT,
  signed_at TEXT,
  signature_path TEXT,
  gps_lat REAL,
  gps_lng REAL,
  gps_accuracy REAL,
  consented INTEGER,
  ip_address TEXT,
  ua TEXT
);

-- audit
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id TEXT,
  signer_id TEXT,
  event TEXT,
  payload_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
