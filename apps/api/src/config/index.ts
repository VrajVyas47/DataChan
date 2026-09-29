import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    platformDb: process.env.MONGODB_PLATFORM_DB || 'datachan_platform',
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
  },
};
