import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting FutureX database initialization...');

  // 1. Clean existing records for a fresh, clean slate
  console.log('🧹 Clearing existing records...');
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

  // 2. Read Admin Configuration from Environment Variables with safe local defaults
  const adminName = (process.env.ADMIN_SEED_NAME || 'FutureX Admin').trim();
  const adminEmail = (process.env.ADMIN_SEED_EMAIL || 'admin@futurex.com').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'Admin2026!@#';

  const nameParts = adminName.split(' ');
  const firstName = nameParts[0] || 'FutureX';
  const lastName = nameParts.slice(1).join(' ') || 'Admin';

  // 3. Hash Password Securely with Argon2id
  const passwordHash = await argon2.hash(adminPassword);

  // 4. Idempotent Admin Creation (Upsert)
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      firstName,
      lastName,
      globalRole: 'ADMIN',
      isActive: true,
      jobTitle: 'System Administrator',
    },
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

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 FutureX Initial Seed Completed Successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`👤 Initial Admin Account:`);
  console.log(`   Name:  ${admin.firstName} ${admin.lastName}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Role:  ${admin.globalRole}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Database Summary:');
  console.log('   Users:            1 (Admin)');
  console.log('   Projects:         0 (Create via application UI)');
  console.log('   Tasks:            0');
  console.log('   Teams:            0');
  console.log('   Notifications:    0');
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
