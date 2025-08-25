const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'contracts.db');
const DB_DIR = path.dirname(DB_PATH);

// Create data directory if it doesn't exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log(`Created database directory: ${DB_DIR}`);
}

// Initialize the database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    process.exit(1);
  }
  console.log(`Connected to database at ${DB_PATH}`);
  
  // Read and execute schema
  const schema = fs.readFileSync(path.join(__dirname, 'sql', 'schema.sql'), 'utf8');
  
  db.serialize(() => {
    db.exec(schema, (err) => {
      if (err) {
        console.error('Error executing schema', err);
        process.exit(1);
      }
      console.log('Database schema initialized successfully');
      db.close();
    });
  });
});

module.exports = { DB_PATH };
