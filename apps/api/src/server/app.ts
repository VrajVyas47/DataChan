import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { config } from '../config';
import authRoutes from '../modules/auth/authRoutes';
import userRoutes from '../modules/users/userRoutes';
import workspaceRoutes from '../modules/workspaces/workspaceRoutes';
import databaseRoutes from '../modules/databases/databaseRoutes';
import collectionRoutes from '../modules/collections/collectionRoutes';
import documentRoutes from '../modules/documents/documentRoutes';
import playgroundRoutes from '../modules/playground/playgroundRoutes';
import queryHistoryRoutes from '../modules/query-history/queryHistoryRoutes';
import coursesRoutes from '../modules/learning/coursesRoutes';
import modulesRoutes from '../modules/learning/modulesRoutes';
import sectionsRoutes from '../modules/learning/sectionsRoutes';
import learningRoutes from '../modules/learning/learningRoutes';
import challengeRoutes from '../modules/challenges/challengeRoutes';
import dataModelRoutes from '../modules/data-models/dataModelRoutes';
import forumRoutes from '../modules/forum/forumRoutes';
import classroomRoutes from '../modules/classrooms/classroomRoutes';
import adminRoutes from '../modules/admin/adminRoutes';
import { errorHandler } from '../middleware/errorHandler';
import { AuthorizationError } from '../errors';

export function createApp(): express.Application {
  const app = express();

  // 1. Explicit, strictly-scoped CORS (Never '*' with credentials: true)
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (config.cors.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new AuthorizationError(`CORS policy restricts access from origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // 2. Cookie Parser for HttpOnly Session Cookie Handling
  app.use(cookieParser());

  // 3. Body Parsers with strict size limits
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 4. Security Headers Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (config.nodeEnv === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // 5. CSRF Protection for state-changing operations via HttpOnly cookies
  app.use((req: Request, res: Response, next: NextFunction) => {
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    const hasSessionCookie = !!req.cookies?.[config.session.cookieName];

    // If an ambient session cookie is used for a mutation, strictly verify Origin / Referer
    if (isMutation && hasSessionCookie) {
      const origin = req.headers.origin;
      const referer = req.headers.referer;

      if (origin) {
        if (!config.cors.allowedOrigins.includes(origin)) {
          return next(new AuthorizationError('CSRF validation failed: Origin mismatch'));
        }
      } else if (referer) {
        const matchesAllowed = config.cors.allowedOrigins.some((allowed) => referer.startsWith(allowed));
        if (!matchesAllowed) {
          return next(new AuthorizationError('CSRF validation failed: Referer mismatch'));
        }
      } else if (config.nodeEnv === 'production') {
        return next(new AuthorizationError('CSRF validation failed: Missing Origin and Referer headers on credentialed mutation'));
      }
    }
    next();
  });

  // 6. Rate Limiting for Security-Sensitive Authentication Endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 session exchanges per 15 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Too many authentication attempts. Please try again in a few minutes.',
      },
      data: null,
    },
  });

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Health check endpoint (Public)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'DATA-CHAN API', time: new Date().toISOString() });
  });

  // REST API v1 Routing
  const v1 = express.Router();
  v1.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'DATA-CHAN API', time: new Date().toISOString() });
  });

  // Mount auth routes with rate limiting on session creation
  v1.use('/auth/session', authLimiter);
  v1.use('/auth', authRoutes);

  v1.use('/profile', userRoutes);
  v1.use('/workspaces', workspaceRoutes);
  v1.use('/databases', databaseRoutes);
  v1.use('/databases', collectionRoutes); // allows /databases/:id/collections
  v1.use('/databases', documentRoutes); // allows /databases/:id/collections/:name/documents
  v1.use('/playground', playgroundRoutes);
  v1.use('/query-history', queryHistoryRoutes);
  v1.use('/courses', coursesRoutes);
  v1.use('/modules', modulesRoutes);
  v1.use('/lessons', learningRoutes);
  v1.use('/sections', sectionsRoutes);
  v1.use('/challenges', challengeRoutes);
  v1.use('/data-models', dataModelRoutes);
  v1.use('/forum', forumRoutes);
  v1.use('/classrooms', classroomRoutes);
  v1.use('/admin', adminRoutes);

  app.use('/api/v1', v1);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
