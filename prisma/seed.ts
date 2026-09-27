import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
for (const [name, role] of [['operator', 'operator'], ['reviewer', 'reviewer'], ['admin', 'admin']]) {
  await prisma.user.upsert({
    where: { name },
    update: {},
    create: { name, role, password_hash: await bcrypt.hash('demo1234', 10) },
  });
}
console.log('Seeded operator, reviewer and admin. Password: demo1234');
await prisma.$disconnect();
