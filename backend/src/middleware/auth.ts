import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token', statusCode: 401 },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Invalid or expired token', statusCode: 401 },
      timestamp: new Date().toISOString(),
    });
  }
}
