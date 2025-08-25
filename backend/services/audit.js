const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
require('dotenv').config();

let _db;
let _SQL;

async function getDb() {
  if (!_db) {
    _SQL = _SQL || await initSqlJs();
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../contractsecure.db');

    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      _db = new _SQL.Database(fileBuffer);
    } else {
      _db = new _SQL.Database();
      // Initialize the audit log table
      _db.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          contract_id INTEGER NOT NULL,
          signer_id INTEGER,
          action TEXT NOT NULL,
          details TEXT,
          ip_address TEXT,
          user_agent TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      saveDb();
    }
  }
  return _db;
}

async function saveDb() {
  if (!_db) return;
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../contractsecure.db');
  const data = _db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

async function logAudit(contractId, signerId, action, details = {}) {
  try {
    const db = await getDb();
    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        contract_id,
        signer_id,
        action,
        details,
        ip_address,
        user_agent,
        created_at
      ) VALUES (
        $contractId,
        $signerId,
        $action,
        $details,
        $ipAddress,
        $userAgent,
        datetime('now')
      )
    `);

    stmt.bind({
      $contractId: contractId,
      $signerId: signerId || null,
      $action: action,
      $details: JSON.stringify(details),
      $ipAddress: details.ip || null,
      $userAgent: details.userAgent || null
    });

    stmt.step();
    stmt.free();
    saveDb();
  } catch (error) {
    console.error('Failed to log audit:', error);
    // Don't fail the request if audit logging fails
  }
}

module.exports = { logAudit, getDb };
