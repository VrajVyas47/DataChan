import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';
import { logger } from '../logging/logger';
import { ApiResponse } from '@datachan/shared-types';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error(`Error processing ${req.method} ${req.originalUrl}: ${err.message}`, err);

  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      data: null,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || null,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Fallback for unhandled unexpected server errors
  const fallbackResponse: ApiResponse = {
    success: false,
    data: null,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected internal server error occurred in the lab engine.',
      details: process.env.NODE_ENV === 'development' ? { message: err.message } : null,
    },
  };

  res.status(500).json(fallbackResponse);
}
