// This file extends the Express.js type definitions
declare global {
  namespace Express {
    interface Response {
      /**
       * Sends a success response with the provided data
       * @param data The data to send in the response
       * @param statusCode The HTTP status code (default: 200)
       */
      sendSuccess: <T = unknown>(data: T, statusCode?: number) => Response;
    }
  }
}

// This file doesn't export anything since it's just type declarations
export {};
