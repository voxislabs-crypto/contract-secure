# ContractSecure Backend

Backend service for the ContractSecure application, built with Node.js, TypeScript, and Express.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ & npm 8+
- TypeScript 5.0+
- PostgreSQL (or your preferred database)
- npm (v9 or higher) or yarn
- TypeScript (v5 or higher)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=4000
   FRONTEND_URL=http://localhost:5173
   # Add other environment variables as needed
   ```

### Development

To start the development server with hot-reload:

```bash
npm run dev
```

### Building for Production

1. Build the TypeScript code:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm start
   ```

### Linting

To check for code style issues:

```bash
npm run lint
```

## Project Structure

```
backend/
├── src/                    # Source files
│   ├── config/            # Configuration files
│   ├── controllers/       # Request handlers
│   ├── middleware/        # Express middleware
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── index.ts           # Application entry point
├── .env                   # Environment variables
├── .eslintrc.js           # ESLint configuration
├── package.json           # Project metadata and dependencies
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## API Documentation

### Health Check

- `GET /health` - Check if the server is running

### Contracts

- `GET /api/contracts` - Get all contracts
- `POST /api/contracts` - Create a new contract
- `GET /api/contracts/:id` - Get a specific contract
- `PUT /api/contracts/:id` - Update a contract
- `DELETE /api/contracts/:id` - Delete a contract

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
