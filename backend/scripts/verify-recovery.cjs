// Uses only disposable local databases. Never migrates or restores into DATABASE_URL.
const { randomBytes } = require('crypto');
const { execFileSync } = require('child_process');
const { mkdtempSync, rmSync, cpSync, mkdirSync, readdirSync, existsSync } = require('fs');
const { tmpdir } = require('os');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const base = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) throw new Error('Local PostgreSQL only');
  const suffix = randomBytes(12).toString('hex');
  const names = [`futurex_recovery_${suffix}`, `futurex_restore_${suffix}`];
  const adminUrl = new URL(base); adminUrl.pathname = '/postgres'; adminUrl.search = '';
  const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
  const scratch = mkdtempSync(path.join(tmpdir(), 'futurex-recovery-'));
  const schemaDir = path.join(scratch, 'prisma');
  mkdirSync(path.join(schemaDir, 'migrations'), { recursive: true });
  cpSync(path.join(__dirname, '../prisma/schema.prisma'), path.join(schemaDir, 'schema.prisma'));
  const migrations = path.join(__dirname, '../prisma/migrations');
  for (const entry of readdirSync(migrations, { withFileTypes: true })) {
    const sourcePath = path.join(migrations, entry.name);
    if (entry.isDirectory() && !existsSync(path.join(sourcePath, 'migration.sql'))) {
      console.log(`Ignoring local empty migration directory (not deployable): ${entry.name}`);
      continue;
    }
    cpSync(sourcePath, path.join(schemaDir, 'migrations', entry.name), { recursive: true });
  }
  const bin = process.env.PG_BIN || (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/17/bin' : '');
  const command = (name) => bin ? path.join(bin, name + (process.platform === 'win32' ? '.exe' : '')) : name;
  const pgEnv = { ...process.env, PGHOST: base.hostname, PGPORT: base.port || '5432', PGUSER: decodeURIComponent(base.username), PGPASSWORD: decodeURIComponent(base.password) };
  const urlFor = (name) => { const url = new URL(base); url.pathname = '/' + name; url.search = ''; return url.toString(); };
  const prisma = (args) => execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), ...args], { cwd: path.join(__dirname, '..'), env: { ...process.env, DATABASE_URL: urlFor(names[0]) }, stdio: 'pipe' });
  let source, restored;
  let migrationPassed = false;
  const created = [];
  try {
    for (const name of names) {
      if (!/^futurex_(recovery|restore)_[a-f0-9]{24}$/.test(name)) throw new Error('Unsafe database name');
      await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`); created.push(name);
    }
    try {
      prisma(['migrate', 'deploy', '--schema', path.join(schemaDir, 'schema.prisma')]);
      console.log('Migration history replay: PASS');
      const drift = prisma(['migrate', 'diff', '--from-url', urlFor(names[0]), '--to-schema-datamodel', path.join(schemaDir, 'schema.prisma'), '--exit-code']);
      console.log('Migration/schema parity: PASS'); migrationPassed = true;
    }
    catch (error) {
      // Only migration output from this disposable DB, never connection credentials.
      const output = String(error.stderr || '') + String(error.stdout || '');
      console.log('Migration history replay: FAIL\n' + output.replaceAll(urlFor(names[0]), '[test database]'));
      await admin.$executeRawUnsafe(`DROP DATABASE "${names[0]}" WITH (FORCE)`);
      await admin.$executeRawUnsafe(`CREATE DATABASE "${names[0]}"`);
    }
    prisma(['db', 'push', '--skip-generate']);
    prisma(['db', 'execute', '--file', 'prisma/migrations/202609100002_audit_log_immutability/migration.sql', '--schema', 'prisma/schema.prisma']);
    source = new PrismaClient({ datasources: { db: { url: urlFor(names[0]) } } });
    const user = await source.user.create({ data: { email: 'recovery@test.invalid', firstName: 'Recovery', lastName: 'Fixture', passwordHash: randomBytes(32).toString('hex'), globalRole: 'ADMIN' } });
    const project = await source.project.create({ data: { key: 'RESTORE', name: 'Recovery fixture', projectManagerId: user.id } });
    const task = await source.task.create({ data: { projectId: project.id, creatorId: user.id, assigneeId: user.id, title: 'Recovery task', humanId: 'RESTORE-101', taskNumber: 101, status: 'DONE', progress: 100 } });
    const audit = await source.auditLog.create({ data: { actorId: user.id, action: 'RECOVERY_FIXTURE', entityType: 'Task', entityId: task.id } });
    const dump = path.join(scratch, 'fixture.dump');
    execFileSync(command('pg_dump'), ['--format=custom', '--file', dump, '--dbname', names[0]], { env: pgEnv, stdio: 'pipe' });
    execFileSync(command('pg_restore'), ['--exit-on-error', '--no-owner', '--no-privileges', '--dbname', names[1], dump], { env: pgEnv, stdio: 'pipe' });
    restored = new PrismaClient({ datasources: { db: { url: urlFor(names[1]) } } });
    const row = await restored.task.findUniqueOrThrow({ where: { id: task.id }, include: { project: true, assignee: true } });
    if (row.progress !== 100 || row.status !== 'DONE' || row.project.name !== project.name || row.assignee.email !== user.email) throw new Error('Restored data mismatch');
    let blocked = false;
    try { await restored.auditLog.update({ where: { id: audit.id }, data: { action: 'MODIFIED' } }); } catch { blocked = true; }
    if (!blocked) throw new Error('Restored audit trigger missing');
    console.log('Database backup/restore: PASS (relationships, completion state and audit immutability preserved)');
    process.exitCode = migrationPassed ? 0 : 1;
  } finally {
    await source?.$disconnect(); await restored?.$disconnect();
    for (const name of created) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.$disconnect();
    rmSync(scratch, { recursive: true, force: true });
  }
}
main().catch(() => { console.error('Recovery verification failed; inspect local PostgreSQL tools/permissions.'); process.exitCode = 1; });
