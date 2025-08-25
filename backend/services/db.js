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
    
    if (!fs.existsSync(dbPath)) {
      console.error('Database file does not exist. Please run init-db.js first.');
      process.exit(1);
    }

    const fileBuffer = fs.readFileSync(dbPath);
    _db = new _SQL.Database(fileBuffer);
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

async function ensureSignerExists(contractId, signerId) {
  const db = await getDb();
  
  // Check if signer exists
  const checkStmt = db.prepare(`
    SELECT id FROM signers 
    WHERE contract_id = $contractId AND signer_id = $signerId
  `);
  checkStmt.bind({ $contractId: contractId, $signerId: signerId });
  const exists = checkStmt.step();
  checkStmt.free();

  if (!exists) {
    // Create a new signer
    const stmt = db.prepare(`
      INSERT INTO signers (
        contract_id, 
        signer_id,
        email,
        name,
        created_at,
        updated_at
      ) VALUES (
        $contractId, 
        $signerId,
        $email,
        $name,
        datetime('now'),
        datetime('now')
      )
    `);

    stmt.bind({
      $contractId: contractId,
      $signerId: signerId,
      $email: `test${signerId}@example.com`,
      $name: `Test User ${signerId}`
    });
    stmt.step();
    stmt.free();
    await saveDb();
    console.log(`Created new signer: contract=${contractId}, signer=${signerId}`);
    return false; // Was just created
  }
  return true; // Already existed
}

async function updateSignerConsent(data) {
  const db = await getDb();
  
  // Ensure the signer exists
  await ensureSignerExists(data.contractId, data.signerId);

  // Now update the signer's consent
  const stmt = db.prepare(`
    UPDATE signers
    SET consent_given_at = $givenAt,
        consent_ip = $ip,
        consent_user_agent = $userAgent,
        gps_latitude = $lat,
        gps_longitude = $lng,
        gps_accuracy = $acc,
        updated_at = datetime('now')
    WHERE contract_id = $contractId AND signer_id = $signerId
  `);

  stmt.bind({
    $givenAt: data.consentGivenAt.toISOString(),
    $ip: data.consentIp,
    $userAgent: data.consentUserAgent,
    $lat: data.gpsLatitude,
    $lng: data.gpsLongitude,
    $acc: data.gpsAccuracy,
    $contractId: data.contractId,
    $signerId: data.signerId
  });
  
  stmt.step();
  stmt.free();
  await saveDb();

  return { changes: db.getRowsModified() };
}

module.exports = { updateSignerConsent, getDb, ensureSignerExists };
