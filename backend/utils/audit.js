const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./db');

async function logAudit(contractId, signerId, event, meta = {}) {
  const db = await getDb();
  const id = uuidv4();
  const metaJson = JSON.stringify(meta);
  
  await db.run(
    'INSERT INTO audit (id, contract_id, signer_id, event, meta_json) VALUES (?, ?, ?, ?, ?)',
    [id, contractId, signerId, event, metaJson]
  );
  
  return id;
}

module.exports = {
  logAudit
};
