import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger.js';
import { CONFIG } from './config.js';

// Create a new PostgreSQL pool with connection settings
const poolConfig = {
  connectionString: CONFIG.DATABASE_URL,
  max: 20, // max number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Add SSL configuration if in production
if (CONFIG.NODE_ENV === 'production') {
  Object.assign(poolConfig, {
    ssl: {
      rejectUnauthorized: false
    }
  });
}

const pool = new Pool(poolConfig);

// Track if we're connected to the database
let isConnected = false;

// Test the database connection with retry logic
export const connectToDatabase = async (retries = 5, delay = 1000): Promise<Pool> => {
  let client: PoolClient | null = null;
  
  try {
    client = await pool.connect();
    isConnected = true;
    logger.info('Successfully connected to the database');
    return pool;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (retries === 0) {
      logger.error('Max retries reached. Could not connect to the database:', { error: errorMessage });
      process.exit(1);
    }
    
    logger.warn(`Database connection failed. Retrying in ${delay}ms... (${retries} retries left)`);
    await new Promise<void>(resolve => setTimeout(resolve, delay));
    return connectToDatabase(retries - 1, delay * 2);
  } finally {
    if (client) {
      await client.release();
    }
  }
};

// Graceful shutdown handler
export const closeDatabase = async (): Promise<void> => {
  if (isConnected) {
    await pool.end();
    isConnected = false;
    logger.info('Database connection pool closed');
  }
};

// Handle application termination
process.on('SIGTERM', closeDatabase);
process.on('SIGINT', closeDatabase);

// Export the pool for direct queries if needed
export default pool;
