import { Router } from 'express';
import { prisma } from '../db';
import { requireRole } from '../auth';
import { verifyChain } from '../audit';

export const auditRouter = Router();

auditRouter.get('/', requireRole('admin'), async (req, res) => {
  const target = req.query.target ? String(req.query.target) : undefined;
  res.json(
    await prisma.auditLog.findMany({
      where: target ? { target_id: target } : undefined,
      orderBy: { seq: 'desc' },
      take: 200,
    })
  );
});

auditRouter.get('/verify', requireRole('admin'), async (_req, res) => {
  res.json(await verifyChain());
});
