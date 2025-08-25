import winston from 'winston';
import { TransformableInfo } from 'logform';

const { combine, timestamp, printf, colorize, align, json } = winston.format;

// Custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Log format for console
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({
    format: 'YYYY-MM-DD hh:mm:ss.SSS A',
  }),
  align(),
  printf((info: TransformableInfo) => {
    const { level, message, timestamp, ...meta } = info;
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaString}`;
  })
);

// Log format for file (JSON)
const fileFormat = combine(
  timestamp(),
  json()
);

// Create a custom logger class that includes the stream property
class AppLogger {
  private logger: winston.Logger;
  
  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      levels,
      format: fileFormat,
      defaultMeta: { service: 'contract-secure-api' },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: consoleFormat,
        }),
        // File transport for production
        ...(process.env.NODE_ENV === 'production' ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
          })
        ] : []),
      ],
    });
  }

  // Stream for morgan
  public stream = {
    write: (message: string): void => {
      this.info(message.trim());
    },
  };

  // Log methods
  public info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  public error(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, meta);
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  public debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }

  public http(message: string, meta?: Record<string, unknown>): void {
    this.logger.http(message, meta);
  }
}

// Create and export a singleton instance
const logger = new AppLogger();
export { logger };

// Export log functions for backward compatibility
export const log = {
  info: (message: string, meta?: Record<string, unknown>) => logger.info(message, meta),
  error: (message: string, meta?: Record<string, unknown>) => logger.error(message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, meta),
  http: (message: string, meta?: Record<string, unknown>) => logger.http(message, meta),
};

// Export the stream for morgan
export const stream = logger.stream;
