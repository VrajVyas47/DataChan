import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    platformDb: process.env.MONGODB_PLATFORM_DB || 'datachan_platform',
    user: process.env.MONGODB_USER || '',
    password: process.env.MONGODB_PASSWORD || '',
    authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
  },
  sandbox: {
    maxQueryExecutionMs: parseInt(process.env.MAX_QUERY_EXECUTION_MS || '5000', 10),
    maxResultDocuments: parseInt(process.env.MAX_RESULT_DOCUMENTS || '100', 10),
    maxDocumentSizeBytes: parseInt(process.env.MAX_DOCUMENT_SIZE_BYTES || '1048576', 10), // 1MB
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    emulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST || '',
  },
  session: {
    cookieName: process.env.SESSION_COOKIE_NAME || 'datachan_session',
    expirationDays: parseInt(process.env.SESSION_EXPIRATION_DAYS || '7', 10),
  },
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  },
};
