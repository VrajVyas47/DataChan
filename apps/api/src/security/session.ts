import { Response, CookieOptions } from 'express';
import { config } from '../config';

/**
 * Returns standard secure cookie options for the Firebase session cookie.
 */
export function getSessionCookieOptions(expiresInMs: number): CookieOptions {
  const isProd = config.nodeEnv === 'production';
  return {
    maxAge: expiresInMs,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  };
}

/**
 * Sets the HttpOnly session cookie on the Express response.
 */
export function setSessionCookie(res: Response, sessionCookie: string, expiresInMs: number): void {
  const options = getSessionCookieOptions(expiresInMs);
  res.cookie(config.session.cookieName, sessionCookie, options);
}

/**
 * Clears the session cookie on the Express response.
 */
export function clearSessionCookie(res: Response): void {
  const isProd = config.nodeEnv === 'production';
  res.clearCookie(config.session.cookieName, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
}
