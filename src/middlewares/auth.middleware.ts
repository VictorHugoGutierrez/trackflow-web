import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/auth.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.trackflow_session;
  const pathname = req.path;

  const staticExtensions = ['.css', '.js', '.ico', '.png', '.jpg', '.svg', '.woff', '.woff2'];
  if (staticExtensions.some(ext => pathname.endsWith(ext))) {
    return next();
  }

  const publicPaths = ['/login', '/logout', '/first-access', '/api/auth', '/forgot-password'];
  const isExempt = publicPaths.some(p => pathname.startsWith(p)) || pathname === '/';

  if (!token) {
    if (isExempt) {
      return next();
    }
    if (req.accepts('html')) {
      return res.redirect('/login');
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'super-secret-key';
    const decoded = jwt.verify(token, secret) as JWTPayload;
    req.user = decoded;

    if (decoded.mustChangePassword === true && !isExempt && !pathname.startsWith('/first-access')) {
      if (req.accepts('html')) {
        return res.redirect('/first-access');
      }
    }

    if (pathname === '/login' && req.accepts('html')) {
      return res.redirect(decoded.role === 'SUPER_ADMIN' ? '/control-plane' : '/dashboard');
    }

    if (pathname.startsWith('/control-plane') && decoded.role !== 'SUPER_ADMIN') {
      if (req.accepts('html')) {
        return res.redirect('/dashboard');
      }
      return res.status(403).json({ error: 'Forbidden' });
    }

    return next();
  } catch (err: any) {
    console.warn('[authMiddleware] Erro ao validar token:', err.message);
    res.clearCookie('trackflow_session');
    
    if (isExempt) {
      return next();
    }
    if (req.accepts('html')) {
      return res.redirect('/login');
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
