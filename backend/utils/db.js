const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let _db;

async function getDb() {
  if (!_db) {
    _db = await open({
      filename: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'contracts.db'),
      driver: sqlite3.Database
    });
    
    // Enable foreign keys
    await _db.run('PRAGMA foreign_keys = ON');
  }
  return _db;
}

// Helper for transactions
async function transaction(callback) {
  const db = await getDb();
  try {
    await db.run('BEGIN TRANSACTION');
    const result = await callback(db);
    await db.run('COMMIT');
    return result;
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

// Helper for running migrations
async function migrate() {
  const db = await getDb();
  await db.migrate({
    migrationsPath: path.join(__dirname, '..', 'migrations'),
    force: process.env.NODE_ENV === 'test' ? 'last' : false
  });
}

module.exports = {
  getDb,
  transaction,
  migrate
};
