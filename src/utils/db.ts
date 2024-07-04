import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

console.log('Database is running');

export { db };
