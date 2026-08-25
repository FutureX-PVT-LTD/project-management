import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting FutureX database seeding...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.projectUpdate.deleteMany();
  await prisma.taskActivity.deleteMany();
  await prisma.taskAttachment.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskReview.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.taskCollaborator.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleared previous records.');

  // Create Users with Argon2 hashed passwords
  const defaultPasswordHash = await argon2.hash('FutureX123!@#');
  const ownerPasswordHash = await argon2.hash('Owner123!@#');
  const adminPasswordHash = await argon2.hash('Admin123!@#');
  const managerPasswordHash = await argon2.hash('Manager123!@#');
  const devPasswordHash = await argon2.hash('Dev123!@#');
  const artistPasswordHash = await argon2.hash('Artist123!@#');
  const qaPasswordHash = await argon2.hash('Qa123!@#');
  const designerPasswordHash = await argon2.hash('Designer123!@#');

  const owner = await prisma.user.create({
    data: {
      email: 'owner@futurex.com',
      passwordHash: ownerPasswordHash,
      firstName: 'Deshan',
      lastName: 'Silva',
      jobTitle: 'Founder & Studio Head',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      globalRole: 'OWNER',
      isActive: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@futurex.com',
      passwordHash: adminPasswordHash,
      firstName: 'Dilshan',
      lastName: 'Perera',
      jobTitle: 'Head of Operations & Systems',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      globalRole: 'ADMIN',
      isActive: true,
    },
  });

  const pmKasun = await prisma.user.create({
    data: {
      email: 'pm.kasun@futurex.com',
      passwordHash: managerPasswordHash,
      firstName: 'Kasun',
      lastName: 'Mendis',
      jobTitle: 'Lead Producer & Project Manager',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      globalRole: 'PROJECT_MANAGER',
      isActive: true,
    },
  });

  const devNimal = await prisma.user.create({
    data: {
      email: 'dev.nimal@futurex.com',
      passwordHash: devPasswordHash,
      firstName: 'Nimal',
      lastName: 'Fernando',
      jobTitle: 'Senior Gameplay & Engine Developer',
      avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
      globalRole: 'TEAM_MEMBER',
      isActive: true,
    },
  });

  const artistAmal = await prisma.user.create({
    data: {
      email: 'artist.amal@futurex.com',
      passwordHash: artistPasswordHash,
      firstName: 'Amal',
      lastName: 'Perera',
      jobTitle: 'Senior 3D Artist & Modeler',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
      globalRole: 'TEAM_MEMBER',
      isActive: true,
    },
  });

  const qaKavindi = await prisma.user.create({
    data: {
      email: 'qa.kavindi@futurex.com',
      passwordHash: qaPasswordHash,
      firstName: 'Kavindi',
      lastName: 'Jayawardena',
      jobTitle: 'Lead QA Engineer',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      globalRole: 'TEAM_MEMBER',
      isActive: true,
    },
  });

  const designerShehan = await prisma.user.create({
    data: {
      email: 'designer.shehan@futurex.com',
      passwordHash: designerPasswordHash,
      firstName: 'Shehan',
      lastName: 'Wickramasinghe',
      jobTitle: 'Lead UI/UX Designer',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      globalRole: 'TEAM_MEMBER',
      isActive: true,
    },
  });

  console.log('✅ Created 7 FutureX users across all roles.');

  // Create Teams
  const teamGameDev = await prisma.team.create({
    data: {
      name: 'Game Engineering',
      description: 'Unity/Unreal engine architecture, game physics, and gameplay mechanics.',
      leadUserId: devNimal.id,
      members: {
        create: [{ userId: devNimal.id }, { userId: pmKasun.id }],
      },
    },
  });

  const team3DArt = await prisma.team.create({
    data: {
      name: '3D Art & Assets',
      description: 'Vehicle models, characters, high-poly sculpting, textures, and environment rigging.',
      leadUserId: artistAmal.id,
      members: {
        create: [{ userId: artistAmal.id }, { userId: designerShehan.id }],
      },
    },
  });

  const teamQA = await prisma.team.create({
    data: {
      name: 'Quality Assurance',
      description: 'Functional gameplay tests, regression suites, device compatibility, and performance profiling.',
      leadUserId: qaKavindi.id,
      members: {
        create: [{ userId: qaKavindi.id }],
      },
    },
  });

  const teamUIUX = await prisma.team.create({
    data: {
      name: 'UI/UX & Creative',
      description: 'HUD interfaces, menus, sound design, visual effects, and player experience.',
      leadUserId: designerShehan.id,
      members: {
        create: [{ userId: designerShehan.id }],
      },
    },
  });

  console.log('✅ Created 4 Teams.');

  // Project 1: Colombo Rider – New Bike Update (CR)
  const targetDateCR = new Date();
  targetDateCR.setDate(targetDateCR.getDate() + 25);

  const projectCR = await prisma.project.create({
    data: {
      key: 'CR',
      name: 'Colombo Rider – New Bike Update',
      description:
        'Major seasonal content update introducing high-performance super-bikes, realistic dynamic physics, and custom exhaust acoustics.',
      status: 'ACTIVE',
      health: 'ON_TRACK',
      healthReason: 'All asset production on schedule for Beta milestone.',
      progress: 35,
      startDate: new Date(Date.now() - 10 * 86400000),
      targetDate: targetDateCR,
      projectManagerId: pmKasun.id,
      members: {
        create: [
          { userId: pmKasun.id, role: 'MANAGER' },
          { userId: devNimal.id, role: 'MEMBER' },
          { userId: artistAmal.id, role: 'MEMBER' },
          { userId: qaKavindi.id, role: 'MEMBER' },
          { userId: designerShehan.id, role: 'MEMBER' },
        ],
      },
    },
  });

  // Milestones for Colombo Rider
  const milestoneCR1 = await prisma.milestone.create({
    data: {
      projectId: projectCR.id,
      name: 'Asset Production & 3D Sculpting',
      description: 'Complete high-poly 3D models, UV unwrapping, and 4K PBR textures.',
      targetDate: new Date(Date.now() + 5 * 86400000),
      status: 'IN_PROGRESS',
      progress: 60,
      orderIndex: 1,
    },
  });

  const milestoneCR2 = await prisma.milestone.create({
    data: {
      projectId: projectCR.id,
      name: 'Engine Integration & Physics Tuning',
      description: 'Import into Unity, setup wheel colliders, suspension telemetry, and sound triggers.',
      targetDate: new Date(Date.now() + 14 * 86400000),
      status: 'PLANNED',
      progress: 0,
      orderIndex: 2,
    },
  });

  const milestoneCR3 = await prisma.milestone.create({
    data: {
      projectId: projectCR.id,
      name: 'Beta Release & QA Polish',
      description: 'Full playtesting, frame rate optimization on mobile, and final release signoff.',
      targetDate: targetDateCR,
      status: 'PLANNED',
      progress: 0,
      orderIndex: 3,
    },
  });

  // Colombo Rider Tasks (Realistic Finish-to-Start Dependency Chain)
  const taskCR1 = await prisma.task.create({
    data: {
      taskNumber: 101,
      humanId: 'CR-101',
      title: 'Create Bike 3D Model',
      description: 'Model the 2026 Sportster Superbike frame, fairings, wheels, and handlebar cluster in Blender/Maya.',
      projectId: projectCR.id,
      milestoneId: milestoneCR1.id,
      creatorId: pmKasun.id,
      assigneeId: artistAmal.id,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      progress: 75,
      estimatedHours: 16,
      startDate: new Date(Date.now() - 4 * 86400000),
      dueDate: new Date(Date.now() + 2 * 86400000),
    },
  });

  const taskCR2 = await prisma.task.create({
    data: {
      taskNumber: 102,
      humanId: 'CR-102',
      title: 'Create Bike Textures & Materials',
      description: 'Author 4K PBR metallic/roughness textures in Substance Painter with Colombo racing decals.',
      projectId: projectCR.id,
      milestoneId: milestoneCR1.id,
      creatorId: pmKasun.id,
      assigneeId: artistAmal.id,
      priority: 'HIGH',
      status: 'WAITING',
      progress: 0,
      estimatedHours: 12,
      dueDate: new Date(Date.now() + 5 * 86400000),
    },
  });

  const taskCR3 = await prisma.task.create({
    data: {
      taskNumber: 103,
      humanId: 'CR-103',
      title: 'Import Bike Into Unity',
      description: 'Import FBX asset, setup materials, configure LODs, and align pivot points for steering.',
      projectId: projectCR.id,
      milestoneId: milestoneCR2.id,
      creatorId: pmKasun.id,
      assigneeId: devNimal.id,
      priority: 'HIGH',
      status: 'WAITING',
      progress: 0,
      estimatedHours: 8,
      dueDate: new Date(Date.now() + 9 * 86400000),
    },
  });

  const taskCR4 = await prisma.task.create({
    data: {
      taskNumber: 104,
      humanId: 'CR-104',
      title: 'Configure Bike Physics & Handling',
      description: 'Tune Raycast wheel physics, lean angle stabilization, torque curve, and drift friction.',
      projectId: projectCR.id,
      milestoneId: milestoneCR2.id,
      creatorId: pmKasun.id,
      assigneeId: devNimal.id,
      priority: 'URGENT',
      status: 'WAITING',
      progress: 0,
      estimatedHours: 14,
      dueDate: new Date(Date.now() + 14 * 86400000),
    },
  });

  const taskCR5 = await prisma.task.create({
    data: {
      taskNumber: 105,
      humanId: 'CR-105',
      title: 'QA Gameplay Testing & Signoff',
      description: 'Verify frame rate performance on mobile devices, collision bugs, and physics clipping.',
      projectId: projectCR.id,
      milestoneId: milestoneCR3.id,
      creatorId: pmKasun.id,
      assigneeId: qaKavindi.id,
      priority: 'HIGH',
      status: 'WAITING',
      progress: 0,
      estimatedHours: 10,
      requiresReview: true,
      dueDate: new Date(Date.now() + 20 * 86400000),
    },
  });

  const taskCR6 = await prisma.task.create({
    data: {
      taskNumber: 106,
      humanId: 'CR-106',
      title: 'Bike Exhaust Sound Effects & Spatial Audio',
      description: 'Record and mix dynamic RPM-based motorcycle engine revving audio clips.',
      projectId: projectCR.id,
      milestoneId: milestoneCR2.id,
      creatorId: pmKasun.id,
      assigneeId: designerShehan.id,
      priority: 'MEDIUM',
      status: 'READY',
      progress: 0,
      estimatedHours: 8,
      dueDate: new Date(Date.now() + 10 * 86400000),
    },
  });

  const taskCR7 = await prisma.task.create({
    data: {
      taskNumber: 107,
      humanId: 'CR-107',
      title: 'Garage Bike Selection UI Screen',
      description: 'Design and build the 3D bike inspection UI with stat meters (Speed, Handling, Nitro).',
      projectId: projectCR.id,
      milestoneId: milestoneCR1.id,
      creatorId: pmKasun.id,
      assigneeId: designerShehan.id,
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      progress: 45,
      estimatedHours: 12,
      dueDate: new Date(Date.now() + 4 * 86400000),
    },
  });

  // Create Dependencies:
  // CR-102 (Textures) depends on CR-101 (3D Model)
  await prisma.taskDependency.create({
    data: { predecessorTaskId: taskCR1.id, dependentTaskId: taskCR2.id },
  });

  // CR-103 (Unity Import) depends on CR-101 & CR-102
  await prisma.taskDependency.create({
    data: { predecessorTaskId: taskCR1.id, dependentTaskId: taskCR3.id },
  });
  await prisma.taskDependency.create({
    data: { predecessorTaskId: taskCR2.id, dependentTaskId: taskCR3.id },
  });

  // CR-104 (Physics) depends on CR-103 (Unity Import)
  await prisma.taskDependency.create({
    data: { predecessorTaskId: taskCR3.id, dependentTaskId: taskCR4.id },
  });

  // CR-105 (QA Testing) depends on CR-104 (Physics)
  await prisma.taskDependency.create({
    data: { predecessorTaskId: taskCR4.id, dependentTaskId: taskCR5.id },
  });

  // Activity logs for Colombo Rider
  await prisma.taskActivity.create({
    data: {
      taskId: taskCR1.id,
      projectId: projectCR.id,
      userId: artistAmal.id,
      actionType: 'PROGRESS_UPDATED',
      description: 'Updated progress to 75%: High-poly mesh completed, starting topology optimization.',
    },
  });

  await prisma.taskComment.create({
    data: {
      taskId: taskCR1.id,
      authorId: artistAmal.id,
      content: 'High-poly mesh is looking sharp! Working on poly count optimization for mobile draw call budgets today.',
    },
  });

  // Project 2: HiddenMe – Chapter 2 (HM)
  const targetDateHM = new Date();
  targetDateHM.setDate(targetDateHM.getDate() + 30);

  const projectHM = await prisma.project.create({
    data: {
      key: 'HM',
      name: 'HiddenMe – Chapter 2 Release',
      description: 'Narrative stealth-action adventure title. Chapter 2 introduces the Abandoned Monastery level and Boss AI.',
      status: 'ACTIVE',
      health: 'AT_RISK',
      healthReason: 'Character Animation blocked; Boss AI task is 2 days overdue.',
      manualHealthOverride: false,
      progress: 28,
      startDate: new Date(Date.now() - 20 * 86400000),
      targetDate: targetDateHM,
      projectManagerId: pmKasun.id,
      members: {
        create: [
          { userId: pmKasun.id, role: 'MANAGER' },
          { userId: devNimal.id, role: 'MEMBER' },
          { userId: artistAmal.id, role: 'MEMBER' },
          { userId: qaKavindi.id, role: 'MEMBER' },
        ],
      },
    },
  });

  const milestoneHM1 = await prisma.milestone.create({
    data: {
      projectId: projectHM.id,
      name: 'Monastery Level Blockout',
      description: 'Graybox geometry and stealth sightline validation.',
      targetDate: new Date(Date.now() - 2 * 86400000),
      status: 'COMPLETED',
      progress: 100,
      orderIndex: 1,
    },
  });

  const milestoneHM2 = await prisma.milestone.create({
    data: {
      projectId: projectHM.id,
      name: 'Boss AI & Stealth Mechanics',
      description: 'Perception cone AI, patrol routes, and alert state transitions.',
      targetDate: new Date(Date.now() + 10 * 86400000),
      status: 'IN_PROGRESS',
      progress: 40,
      orderIndex: 2,
    },
  });

  const taskHM1 = await prisma.task.create({
    data: {
      taskNumber: 101,
      humanId: 'HM-101',
      title: 'Character Stealth Animation Set',
      description: 'Crouch walking, wall hugging, silent takedowns, and ledge shimmy animations.',
      projectId: projectHM.id,
      milestoneId: milestoneHM2.id,
      creatorId: pmKasun.id,
      assigneeId: artistAmal.id,
      priority: 'URGENT',
      status: 'BLOCKED',
      progress: 20,
      estimatedHours: 24,
      isManualBlocked: true,
      manualBlockReason: 'Waiting for upgraded motion capture rig license and clean sensor calibration.',
      dueDate: new Date(Date.now() + 4 * 86400000),
    },
  });

  const taskHM2 = await prisma.task.create({
    data: {
      taskNumber: 102,
      humanId: 'HM-102',
      title: 'Boss AI Behavior State Machine',
      description: 'Implement sensory hearing cues, search radius logic, and aggressive combat charge states.',
      projectId: projectHM.id,
      milestoneId: milestoneHM2.id,
      creatorId: pmKasun.id,
      assigneeId: devNimal.id,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      progress: 70,
      estimatedHours: 20,
      dueDate: new Date(Date.now() - 2 * 86400000), // OVERDUE!
    },
  });

  const taskHM3 = await prisma.task.create({
    data: {
      taskNumber: 103,
      humanId: 'HM-103',
      title: 'Chapter 2 Smoke Testing Pass',
      description: 'Smoke test all stealth encounters in Level 2.',
      projectId: projectHM.id,
      milestoneId: milestoneHM2.id,
      creatorId: pmKasun.id,
      assigneeId: qaKavindi.id,
      priority: 'HIGH',
      status: 'WAITING',
      progress: 0,
      estimatedHours: 12,
      dueDate: new Date(Date.now() + 12 * 86400000),
    },
  });

  await prisma.taskDependency.create({
    data: { predecessorTaskId: taskHM2.id, dependentTaskId: taskHM3.id },
  });

  // Project 3: FutureX Platform (WEB)
  const projectWEB = await prisma.project.create({
    data: {
      key: 'WEB',
      name: 'FutureX Platform – Player Backend & Analytics',
      description: 'Scalable cloud infrastructure powering player matchmaking, leaderboards, cross-save profiles, and telemetry.',
      status: 'ACTIVE',
      health: 'ON_TRACK',
      progress: 65,
      startDate: new Date(Date.now() - 30 * 86400000),
      targetDate: new Date(Date.now() + 45 * 86400000),
      projectManagerId: owner.id,
      members: {
        create: [
          { userId: owner.id, role: 'MANAGER' },
          { userId: devNimal.id, role: 'MEMBER' },
          { userId: qaKavindi.id, role: 'MEMBER' },
        ],
      },
    },
  });

  const taskWEB1 = await prisma.task.create({
    data: {
      taskNumber: 101,
      humanId: 'WEB-101',
      title: 'Matchmaking Microservice WebSockets',
      description: 'WebSocket queue room allocation and region-based latency routing.',
      projectId: projectWEB.id,
      creatorId: owner.id,
      assigneeId: devNimal.id,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      progress: 60,
      estimatedHours: 18,
      dueDate: new Date(Date.now() + 6 * 86400000),
    },
  });

  const taskWEB2 = await prisma.task.create({
    data: {
      taskNumber: 102,
      humanId: 'WEB-102',
      title: 'Player Inventory Database Migration',
      description: 'Migrate legacy inventory records to normalized PostgreSQL schema.',
      projectId: projectWEB.id,
      creatorId: owner.id,
      assigneeId: devNimal.id,
      priority: 'MEDIUM',
      status: 'DONE',
      progress: 100,
      completedDate: new Date(Date.now() - 3 * 86400000),
      estimatedHours: 8,
    },
  });

  const taskWEB3 = await prisma.task.create({
    data: {
      taskNumber: 103,
      humanId: 'WEB-103',
      title: 'Security Penetration Testing',
      description: 'Audit JWT token rotation, rate-limiting, and SQL query parameterization.',
      projectId: projectWEB.id,
      creatorId: owner.id,
      assigneeId: qaKavindi.id,
      priority: 'URGENT',
      status: 'READY',
      progress: 0,
      estimatedHours: 16,
      dueDate: new Date(Date.now() + 3 * 86400000),
    },
  });

  // Create notifications
  await prisma.notification.create({
    data: {
      userId: devNimal.id,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: 'You were assigned to "Import Bike Into Unity" (CR-103)',
      linkUrl: `/projects/${projectCR.id}?taskId=${taskCR3.id}`,
    },
  });

  await prisma.notification.create({
    data: {
      userId: artistAmal.id,
      type: 'DUE_SOON',
      title: 'Task Due in 2 Days',
      message: '"Create Bike 3D Model" (CR-101) is due in 2 days.',
      linkUrl: `/projects/${projectCR.id}?taskId=${taskCR1.id}`,
    },
  });

  await prisma.notification.create({
    data: {
      userId: pmKasun.id,
      type: 'PROJECT_HEALTH_CHANGED',
      title: 'Project At Risk Alert',
      message: 'HiddenMe – Chapter 2 is marked At Risk due to overdue tasks.',
      linkUrl: `/projects/${projectHM.id}`,
    },
  });

  console.log('✅ Created Projects, Tasks, Dependencies, Milestones, and Notifications.');
  console.log('🎉 Seed complete! Demo accounts:');
  console.log('  Owner:          owner@futurex.com          / Owner123!@#');
  console.log('  Admin:          admin@futurex.com          / Admin123!@#');
  console.log('  PM:             pm.kasun@futurex.com       / Manager123!@#');
  console.log('  Game Dev:       dev.nimal@futurex.com      / Dev123!@#');
  console.log('  3D Artist:      artist.amal@futurex.com    / Artist123!@#');
  console.log('  QA Lead:        qa.kavindi@futurex.com     / Qa123!@#');
  console.log('  UI/UX Designer: designer.shehan@futurex.com / Designer123!@#');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
