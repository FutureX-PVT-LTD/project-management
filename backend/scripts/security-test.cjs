const { randomUUID, randomBytes } = require('crypto');
const { execFileSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Security tests require a local PostgreSQL database');
  }
  const schema = `futurex_security_test_${randomUUID().replace(/-/g, '')}`;
  url.searchParams.set('schema', schema);
  const env = {
    ...process.env, DATABASE_URL: url.toString(), NODE_ENV: 'test',
    SECURITY_INTEGRATION: 'true', COOKIE_SECURE: 'false',
    JWT_SECRET: randomBytes(48).toString('hex'), JWT_REFRESH_SECRET: randomBytes(48).toString('hex'),
    WEB_URL: 'http://localhost:3000', CORS_ORIGIN: 'http://localhost:3000',
  };
  let result = 0;
  try {
    execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'db', 'push', '--skip-generate'], { env, stdio: 'inherit' });
    execFileSync(process.execPath, [
      require.resolve('prisma/build/index.js'), 'db', 'execute', '--file',
      path.join('prisma', 'migrations', '202609100002_audit_log_immutability', 'migration.sql'),
      '--schema', path.join('prisma', 'schema.prisma'),
    ], { env, stdio: 'inherit' });
    execFileSync(process.execPath, [require.resolve('jest/bin/jest'), '--runInBand', 'security.integration.spec'], { env, stdio: 'inherit' });
  } catch { result = 1; }
  finally {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    try {
      // Identifier is generated locally, never supplied by callers. Only this run's test schema is removed.
      if (!/^futurex_security_test_[a-f0-9]{32}$/.test(schema)) throw new Error('Invalid test schema');
      await prisma.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    } finally { await prisma.$disconnect(); }
  }
  process.exitCode = result;
}
main().catch(() => { console.error('Security test setup or cleanup failed'); process.exitCode = 1; });
