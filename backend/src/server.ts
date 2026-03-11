import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG, ensureDirs } from './config/config.js';
import { networkInterfaces } from 'os';
import OpenApiValidator from 'express-openapi-validator';

// Helper function to get local IP address
function getLocalIpAddress(): string {
  const nets = networkInterfaces();
  const results: { [key: string]: string[] } = {};

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }

  // Return the first available IP address
  const firstInterface = Object.keys(results)[0];
  return results[firstInterface]?.[0] || 'localhost';
}

// OpenAPI validator and Swagger UI are imported dynamically
import { logger } from './utils/logger.js';
import { connectToDatabase } from './config/database.js';
import { errorHandler, requestIdMiddleware, notFoundHandler } from './middleware/errorHandler.js';
import { openApiErrorHandler } from './middleware/validation.js';
import { responseHelpersMiddleware } from './utils/apiResponse.js';
import healthRouter from './routes/health.js';
import contractRouter from './routes/contract.js';
import escrowRouter from './routes/escrow.js';
import { handleStripeWebhook } from './services/escrowService.js';

// Ensure required directories exist
ensureDirs();

// Initialize Express app
const app: Express = express();
const { PORT, FRONTEND_URL, NODE_ENV } = CONFIG;

// Add request ID to every request
app.use((req: Request, res: Response, next: NextFunction) => {
  req.id = req.get('x-request-id') || uuidv4();
  res.setHeader('x-request-id', req.id);
  next();
});

// Set up __dirname equivalent for ES modules
const currentFileUrl = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFileUrl);

// NOTE: A second, more permissive OpenAPI validator is configured inside
// setupOpenApiValidator() below (with ignoreUndocumented: true).

// Add request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };
    logger.info(JSON.stringify(logData));
  });
  next();
});

// Add response helpers
app.use(responseHelpersMiddleware);

// Ensure the port is a number
const port = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;

// Get the directory name from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to OpenAPI specification
const apiSpecPath = path.join(__dirname, '..', 'server', 'openapi.yaml');

// Initialize OpenAPI validator
async function setupOpenApiValidator() {
  try {
    // Import the OpenAPI validator
    const OpenApiValidator = await import('express-openapi-validator');

    // Apply the middleware to the app
    app.use(
      OpenApiValidator.middleware({
        apiSpec: apiSpecPath,
        validateRequests: true,
        validateResponses: NODE_ENV !== 'production', // Validate responses in non-production
        validateApiSpec: true,
        ignoreUndocumented: true,
        fileUploader: false,
        $refParser: {
          mode: 'bundle',
        },
      })
    );

    logger.info('OpenAPI validator middleware applied');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to initialize OpenAPI validator:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

// Create HTTP server
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Set app locals
app.locals.io = io;

// Add request ID to all requests
app.use(requestIdMiddleware);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(apiLimiter);

// ── Stripe webhook — raw body required for signature verification ──────────
// Must be registered BEFORE express.json() to receive unparsed bytes.
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header' });
    try {
      await handleStripeWebhook(req.body as Buffer, sig);
      return res.json({ received: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Webhook error';
      console.error('[stripe webhook]', msg);
      return res.status(400).send(`Webhook Error: ${msg}`);
    }
  }
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Configure Swagger UI
const setupSwaggerUI = async () => {
  try {
    const swaggerUi = await import('swagger-ui-express');
    const swaggerJsdoc = await import('swagger-jsdoc');

    const options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'ContractSecure API',
          version: '1.0.0',
          description: 'API for managing contracts and signatures',
        },
        servers: [
          {
            url: 'http://localhost:3000',
            description: 'Development server',
          },
        ],
      },
      apis: ['./src/routes/*.ts'], // Path to the API docs
    };

    const specs = swaggerJsdoc.default(options);

    // Setup Swagger UI route
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(specs, {
        explorer: true,
        customSiteTitle: 'ContractSecure API Documentation',
      })
    );

    // Serve OpenAPI spec
    app.get('/openapi.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.json(specs);
    });

    logger.info('Swagger UI is available at /api-docs');
  } catch (error) {
    logger.error('Failed to set up Swagger UI', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    requestId: req.id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check endpoint
app.use('/health', healthRouter);

// API Routes
app.use('/api/contracts', contractRouter);
app.use('/api/escrow', escrowRouter);

// Handle OpenAPI validation errors
app.use(openApiErrorHandler);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Call setup functions
setupSwaggerUI().catch((error) => {
  logger.error('Failed to set up Swagger UI:', error);
});

// Start the server
const startServer = async () => {
  try {
    // Connect to database
    await connectToDatabase();
    logger.info('Database connection established');

    // Setup OpenAPI validator
    await setupOpenApiValidator();
    logger.info('OpenAPI validator initialized');

    // Start listening on all network interfaces
    server.listen(port, '0.0.0.0', () => {
      logger.info(`Server running in ${NODE_ENV} mode on port ${port}`);
      logger.info(`API Documentation available at http://localhost:${port}/api-docs`);
      logger.info(
        `API Documentation also available at http://${getLocalIpAddress()}:${port}/api-docs`
      );
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      switch (error.code) {
        case 'EACCES':
          logger.error(`Port ${PORT} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`Port ${PORT} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to start server:', { error: errorMessage });
    process.exit(1);
  }
};

// Start the application
startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('Unhandled Rejection:', { error: error.message, stack: error.stack });
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  // Close server & exit process
  server.close(() => process.exit(1));
});
