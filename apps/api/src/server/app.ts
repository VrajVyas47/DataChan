import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from '../modules/auth/authRoutes';
import userRoutes from '../modules/users/userRoutes';
import workspaceRoutes from '../modules/workspaces/workspaceRoutes';
import databaseRoutes from '../modules/databases/databaseRoutes';
import collectionRoutes from '../modules/collections/collectionRoutes';
import documentRoutes from '../modules/documents/documentRoutes';
import playgroundRoutes from '../modules/playground/playgroundRoutes';
import queryHistoryRoutes from '../modules/query-history/queryHistoryRoutes';
import learningRoutes from '../modules/learning/learningRoutes';
import challengeRoutes from '../modules/challenges/challengeRoutes';
import dataModelRoutes from '../modules/data-models/dataModelRoutes';
import { errorHandler } from '../middleware/errorHandler';

export function createApp(): express.Application {
  const app = express();

  // Standard middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'DATA-CHAN API', time: new Date().toISOString() });
  });

  // REST API v1 Routing
  const v1 = express.Router();
  v1.use('/auth', authRoutes);
  v1.use('/profile', userRoutes);
  v1.use('/workspaces', workspaceRoutes);
  v1.use('/databases', databaseRoutes);
  v1.use('/databases', collectionRoutes); // allows /databases/:id/collections
  v1.use('/databases', documentRoutes); // allows /databases/:id/collections/:name/documents
  v1.use('/playground', playgroundRoutes);
  v1.use('/query-history', queryHistoryRoutes);
  v1.use('/lessons', learningRoutes);
  v1.use('/challenges', challengeRoutes);
  v1.use('/data-models', dataModelRoutes);

  app.use('/api/v1', v1);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
