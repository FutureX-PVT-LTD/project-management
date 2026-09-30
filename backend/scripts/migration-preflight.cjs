// Read-only guard: never mark migrations applied automatically on an existing database.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const [tables] = await db.$queryRaw`SELECT to_regclass('"Task"')::text AS task, to_regclass('"_prisma_migrations"')::text AS migrations`;
  if (!tables.task) return;
  const baseline = tables.migrations ? await db.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = '202609010000_initial_baseline' AND finished_at IS NOT NULL AND rolled_back_at IS NULL` : [];
  if (!baseline.length) throw new Error('Existing database needs a verified baseline before deploy. STOP: back up database/uploads, compare schema on a restored copy, and follow HANDOVER-RELEASE.md. Do not reset or blindly mark migrations applied.');
  console.log('Migration baseline preflight passed.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
