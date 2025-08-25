const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Load OpenAPI spec
const openapiPath = path.join(__dirname, 'openapi-clean.yaml');
const openapiSpec = YAML.load(openapiPath);

// Serve Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Serve OpenAPI spec at /openapi.json
app.get('/openapi.json', (req, res) => {
  res.json(openapiSpec);
});

// Stub handlers for future endpoints
app.all('/api/auth/*', (req, res) => {
  res.status(501).json({ 
    ok: false,
    error: 'not_implemented',
    message: 'This endpoint is planned for a future release'
  });
});

app.all('/api/admin/*', (req, res) => {
  res.status(501).json({ 
    ok: false,
    error: 'not_implemented',
    message: 'This endpoint is planned for a future release'
  });
});

app.all('/webhooks*', (req, res) => {
  res.status(501).json({ 
    ok: false,
    error: 'not_implemented',
    message: 'This endpoint is planned for a future release'
  });
});

app.all('/audit-logs*', (req, res) => {
  res.status(501).json({ 
    ok: false,
    error: 'not_implemented',
    message: 'This endpoint is planned for a future release'
  });
});

// Start server
app.listen(port, () => {
  console.log(`ContractSecure API documentation available at http://localhost:${port}/api-docs`);
  console.log(`OpenAPI spec available at http://localhost:${port}/openapi.json`);
});
