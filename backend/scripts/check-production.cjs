const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'production';

async function main() {
  const { validateSecurityEnvironment } = require('../dist/common/security/http-security');
  const { getJwtAccessSecret, getJwtRefreshSecret } = require('../dist/modules/auth/auth-secrets');
  validateSecurityEnvironment();
  getJwtAccessSecret();
  getJwtRefreshSecret();
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    await prisma.session.findFirst({ select: { id: true, lastSeenAt: true } });
    console.log('Production configuration and session schema checks passed');
  } catch {
    throw new Error('Database unavailable or session migration missing. Check DB connectivity and migration status');
  } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
