-- This script will only add columns that don't already exist
PRAGMA foreign_keys=off;

-- Create a temporary table with the new schema
CREATE TABLE signers_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,
  signer_id INTEGER NOT NULL,
  email TEXT,
  name TEXT,
  consent_given_at TEXT,
  consent_ip TEXT,
  consent_user_agent TEXT,
  gps_latitude REAL,
  gps_longitude REAL,
  gps_accuracy REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  gps_lat REAL,
  gps_lng REAL,
  consented INTEGER DEFAULT 0,
  ip_address TEXT,
  ua TEXT,
  otp_hash TEXT,
  otp_expires_at TEXT,
  otp_verified_at TEXT,
  UNIQUE(contract_id, signer_id)
);

-- Copy data from old table to new table
INSERT INTO signers_new (
  id, contract_id, signer_id, email, name,
  consent_given_at, consent_ip, consent_user_agent,
  gps_latitude, gps_longitude, gps_accuracy,
  created_at, updated_at, gps_lat, gps_lng
) 
SELECT 
  id, contract_id, signer_id, email, name, 
  consent_given_at, consent_ip, consent_user_agent,
  gps_latitude, gps_longitude, gps_accuracy,
  created_at, updated_at, gps_latitude, gps_longitude
FROM signers;

-- Drop the old table
DROP TABLE signers;

-- Rename the new table to the original name
ALTER TABLE signers_new RENAME TO signers;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_signers_contract_signer ON signers(contract_id, signer_id);

-- Enable foreign keys
PRAGMA foreign_keys=on;
