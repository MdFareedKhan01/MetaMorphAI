import { Router, type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { LoginRequest } from '@ps154/shared';
import { prisma } from './db';
import { env } from './env';

export type Role = 'operator' | 'reviewer' | 'admin';
export interface AuthUser { id: string; name: string; role: Role }
declare global { namespace Express { interface Request { user?: AuthUser } } }

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { name, password } = LoginRequest.parse(req.body);
  const user = await prisma.user.findUnique({ where: { name } });
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: 'Invalid name or password' });
    return;
  }
  const payload: AuthUser = { id: user.id, name: user.name, role: user.role as Role };
  res.json({ token: jwt.sign(payload, env.JWT_SECRET, { expiresIn: '12h' }), user: payload });
});

export function verifyToken(token?: string | null): AuthUser | null {
  if (!token) return null;
  try { return jwt.verify(token, env.JWT_SECRET) as AuthUser; } catch { return null; }
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = verifyToken(req.headers.authorization?.replace(/^Bearer /, ''));
  if (!user) { res.status(401).json({ error: 'Sign in required' }); return; }
  req.user = user;
  next();
}

export const requireRole = (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (req.user && roles.includes(req.user.role)) return next();
    res.status(403).json({ error: 'Your role cannot do this' });
  };
