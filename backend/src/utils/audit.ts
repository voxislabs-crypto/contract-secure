import { logger } from './logger.js';
import pool from '../config/database.js';

export interface AuditLogInput {
  event: string;
  message: string;
  contractId?: string;
  signerId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string;
}

export interface AuditLogRecord extends Omit<AuditLogInput, 'metadata'> {
  id: number;
  payload: string; // stringified metadata
  createdAt: string;
}

export async function logAudit(logData: AuditLogInput): Promise<void> {
  const client = await pool.connect();
  
  try {
    const timestamp = new Date().toISOString();
    const payload = JSON.stringify(logData.metadata || {});
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      logger.info('AUDIT', { ...logData, timestamp });
    }

    // Save to database
    // Insert audit log
    await client.query(
      `INSERT INTO audit_logs (
        contract_id, 
        signer_id, 
        event, 
        message,
        payload, 
        ip_address, 
        user_agent,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        logData.contractId || null,
        logData.signerId || null,
        logData.event,
        logData.message,
        payload,
        logData.ipAddress || null,
        logData.userAgent || null,
        logData.timestamp || new Date()
      ]
    );

    // Create indexes if they don't exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_contract_id ON audit_logs(contract_id);
      CREATE INDEX IF NOT EXISTS idx_audit_signer_id ON audit_logs(signer_id);
      CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_logs(event);
      CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
    `);
    
    logger.info('Audit logs table initialized');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to save audit log:', { error: errorMessage });
    throw error; // Re-throw to allow callers to handle the error
  } finally {
    client.release();
  }
}

// Initialize audit logs table
export async function initAuditTable(): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        contract_id TEXT,
        signer_id TEXT,
        event TEXT NOT NULL,
        message TEXT NOT NULL,
        payload TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes if they don't exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_contract_id ON audit_logs(contract_id);
      CREATE INDEX IF NOT EXISTS idx_audit_signer_id ON audit_logs(signer_id);
      CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_logs(event);
      CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
    `);
    
    logger.info('Audit logs table initialized');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to initialize audit logs table:', { error: errorMessage });
    throw error;
  } finally {
    client.release();
  }
}

// Helper function to get paginated audit logs
export async function getAuditLogs(
  options: {
    contractId?: string;
    signerId?: string;
    event?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ logs: AuditLogRecord[]; total: number }> {
  const client = await pool.connect();
  
  try {
    const { contractId, signerId, event, limit = 50, offset = 0 } = options;
    const whereClauses: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;
    
    if (contractId) {
      whereClauses.push(`contract_id = $${paramIndex++}`);
      params.push(contractId);
    }
    
    if (signerId) {
      whereClauses.push(`signer_id = $${paramIndex++}`);
      params.push(signerId);
    }
    
    if (event) {
      whereClauses.push(`event = $${paramIndex++}`);
      params.push(event);
    }
    
    const whereClause = whereClauses.length > 0 
      ? `WHERE ${whereClauses.join(' AND ')}` 
      : '';
    
    // Get total count for pagination
    const totalResult = await client.query<{ count: string }>(
      `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
      params
    );
    
    // Get paginated results
    const query = `
      SELECT 
        id, 
        contract_id as "contractId", 
        signer_id as "signerId", 
        event, 
        message,
        payload,
        ip_address as "ipAddress", 
        user_agent as "userAgent",
        created_at as "createdAt"
      FROM audit_logs 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    const result = await client.query<{
      id: number;
      contract_id: string | null;
      signer_id: string | null;
      event: string;
      message: string;
      payload: string;
      ip_address: string | null;
      user_agent: string | null;
      created_at: Date;
    }>(query, [
      ...params,
      limit,
      offset
    ]);

    const logs = result.rows.map(row => ({
      id: row.id,
      contractId: row.contract_id || undefined,
      signerId: row.signer_id || undefined,
      event: row.event,
      message: row.message,
      payload: row.payload,
      ipAddress: row.ip_address || undefined,
      userAgent: row.user_agent || undefined,
      createdAt: row.created_at.toISOString()
    }));
    
    return {
      logs,
      total: parseInt(totalResult.rows[0].count, 10)
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to fetch audit logs:', { error: errorMessage });
    throw error;
  } finally {
    client.release();
  }
}
