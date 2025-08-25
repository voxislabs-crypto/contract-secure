import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function requireEnv(name: string, def?: string): string {
  const v = process.env[name] ?? def;
  if (v === undefined) throw new Error(`Missing env: ${name}`);
  return v;
}

function optionalEnv(name: string, def?: string): string {
  return process.env[name] ?? def ?? '';
}

export const CONFIG = {
  // Core
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  PORT: Number(optionalEnv('PORT', '4000')),
  FRONTEND_URL: optionalEnv('FRONTEND_URL', 'http://localhost:3000'),
  BASE_URL: optionalEnv('BASE_URL', 'http://localhost:4000'),
  JWT_SECRET: requireEnv('JWT_SECRET', 'change_me_dev_only'),
  DEV_ACCEPT_CODE: optionalEnv('DEV_ACCEPT_CODE'),
  
  // Database
  DATABASE_URL: optionalEnv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/contractsecure'),

  // Email
  SMTP_HOST: optionalEnv('SMTP_HOST'),
  SMTP_PORT: Number(optionalEnv('SMTP_PORT', '587')),
  SMTP_SECURE: optionalEnv('SMTP_SECURE', 'false') === 'true',
  SMTP_USER: optionalEnv('SMTP_USER'),
  SMTP_PASS: optionalEnv('SMTP_PASS'),
  SMTP_FROM: optionalEnv('SMTP_FROM', 'ContractSecure <no-reply@localhost>'),

  // Paths
  DATA_DIR: optionalEnv('DATA_DIR', path.join(__dirname, '..', '..', 'server', 'data')),
  PUBLIC_DIR: optionalEnv('PUBLIC_DIR', path.join(__dirname, '..', '..', 'public')),
  UPLOADS_DIR: optionalEnv('UPLOADS_DIR', path.join(__dirname, '..', '..', 'uploads')),
} as const;

export function ensureDirs(): void {
  [
    CONFIG.DATA_DIR,
    CONFIG.PUBLIC_DIR,
    CONFIG.UPLOADS_DIR,
    path.join(CONFIG.PUBLIC_DIR, 'signatures')
  ].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Export config as default for backward compatibility
const config = {
  // Server
  port: CONFIG.PORT,
  host: '0.0.0.0',
  nodeEnv: CONFIG.NODE_ENV as 'development' | 'production' | 'test',
  
  // Frontend
  frontendUrl: CONFIG.FRONTEND_URL,
  
  // Database
  databaseUrl: `file:${path.join(CONFIG.DATA_DIR, 'contracts.sqlite')}`,
  
  // Email
  email: {
    smtpHost: CONFIG.SMTP_HOST,
    smtpPort: CONFIG.SMTP_PORT,
    smtpUser: CONFIG.SMTP_USER,
    smtpPass: CONFIG.SMTP_PASS,
    smtpFrom: CONFIG.SMTP_FROM,
    devAcceptCode: !!CONFIG.DEV_ACCEPT_CODE,
  },
  
  // JWT
  jwt: {
    secret: CONFIG.JWT_SECRET,
    expiresIn: '7d',
  },
  
  // File Uploads
  uploads: {
    dir: CONFIG.UPLOADS_DIR,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    signaturesDir: path.join(CONFIG.UPLOADS_DIR, 'signatures'),
  },
};

export default config;
