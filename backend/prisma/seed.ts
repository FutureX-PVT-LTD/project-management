import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { seedDevelopmentChecklist } from './development-checklist.seed';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_RESET === 'true') {
    throw new Error('Production database reset is prohibited');
  }
  if (!process.env.OWNER_SEED_PASSWORD || !process.env.ADMIN_SEED_PASSWORD ||
      process.env.OWNER_SEED_PASSWORD.length < 12 || process.env.ADMIN_SEED_PASSWORD.length < 12) {
    throw new Error('Set OWNER_SEED_PASSWORD and ADMIN_SEED_PASSWORD to independent passwords of at least 12 characters');
  }
  console.log('🌱 Starting FutureX database initialization...');

  // 1. Optional clean reset for local demo databases only.
  // Production-like data is preserved by default.
  if (process.env.SEED_RESET === 'true') {
    console.log('🧹 Clearing existing records because SEED_RESET=true...');
    await prisma.notification.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.projectUpdate.deleteMany();
    await prisma.taskActivity.deleteMany();
    await prisma.taskAttachment.deleteMany();
    await prisma.taskComment.deleteMany();
    await prisma.taskReview.deleteMany();
    await prisma.taskDependency.deleteMany();
    await prisma.taskCollaborator.deleteMany();
    await prisma.taskDailyUpdate.deleteMany();
    await prisma.task.deleteMany();
    await prisma.milestone.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    console.log('✅ Database reset to clean state (0 records).');
  } else {
    console.log('✅ Preserving existing database records. Set SEED_RESET=true for a local full reset.');
  }

  // 2. Read Super Admin and Admin Configuration from Environment Variables with safe local defaults
  const ownerName = (process.env.OWNER_SEED_NAME || 'FutureX Super Admin').trim();
  const ownerEmail = (process.env.OWNER_SEED_EMAIL || 'owner@futurex.com').trim().toLowerCase();
  const ownerPassword = process.env.OWNER_SEED_PASSWORD;
  const adminName = (process.env.ADMIN_SEED_NAME || 'FutureX Admin').trim();
  const adminEmail = (process.env.ADMIN_SEED_EMAIL || 'admin@futurex.com').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;

  const ownerNameParts = ownerName.split(' ');
  const ownerFirstName = ownerNameParts[0] || 'FutureX';
  const ownerLastName = ownerNameParts.slice(1).join(' ') || 'Super Admin';
  const nameParts = adminName.split(' ');
  const firstName = nameParts[0] || 'FutureX';
  const lastName = nameParts.slice(1).join(' ') || 'Admin';

  // 3. Hash Password Securely with Argon2id
  const ownerPasswordHash = await argon2.hash(ownerPassword);
  const passwordHash = await argon2.hash(adminPassword);

  // 4. Idempotent Super Admin and Admin Creation (Upsert)
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      passwordHash: ownerPasswordHash,
      firstName: ownerFirstName,
      lastName: ownerLastName,
      jobTitle: 'Super Administrator',
      globalRole: 'OWNER',
      isActive: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      firstName,
      lastName,
      jobTitle: 'System Administrator',
      globalRole: 'ADMIN',
      isActive: true,
    },
  });

  const checklistSeed = await seedDevelopmentChecklist(prisma);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 FutureX Initial Seed Completed Successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`👑 Initial Super Admin Account:`);
  console.log(`   Name:  ${owner.firstName} ${owner.lastName}`);
  console.log(`   Email: ${owner.email}`);
  console.log(`   Role:  ${owner.globalRole}`);
  console.log(`👤 Initial Admin Account:`);
  console.log(`   Name:  ${admin.firstName} ${admin.lastName}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Role:  ${admin.globalRole}`);
  console.log(`📋 Development Checklist Template:`);
  console.log(`   Version: ${checklistSeed.version}`);
  console.log(`   Seeded rows: ${checklistSeed.seededCount}`);
  console.log(`   Missing source rows: ${checklistSeed.missingSourceRows}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Database Summary:');
  console.log('   Super Admin:      ensured');
  console.log('   Admin:            ensured');
  console.log('   Checklist:        ensured');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
