const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const anjana = await p.user.findFirst({ where: { firstName: 'Anjana' } });
  const admin = await p.user.findFirst({ where: { globalRole: 'ADMIN' } });
  if (!anjana || !admin) {
    console.error('Anjana or Admin not found');
    return;
  }

  // 1. Ensure HiddenMe exists
  let hiddenMe = await p.project.findFirst({ where: { name: 'HiddenMe' } });
  if (!hiddenMe) {
    hiddenMe = await p.project.create({
      data: {
        name: 'HiddenMe',
        key: 'HM',
        description: 'Stealth privacy and security application',
        projectManagerId: admin.id,
        targetDate: new Date('2026-09-30T00:00:00Z'),
        status: 'ACTIVE',
        health: 'ON_TRACK',
      },
    });
    console.log('Created project HiddenMe');
  }

  // Ensure Anjana is member of HiddenMe
  const hmMember = await p.projectMember.findFirst({
    where: { projectId: hiddenMe.id, userId: anjana.id },
  });
  if (!hmMember) {
    await p.projectMember.create({
      data: { projectId: hiddenMe.id, userId: anjana.id, role: 'CONTRIBUTOR' },
    });
    console.log('Added Anjana to HiddenMe');
  }

  // Ensure HiddenMe has an IN_PROGRESS development task for Anjana: PD-21 Backend/API Integration
  let hmTask = await p.task.findFirst({
    where: { projectId: hiddenMe.id, humanId: 'HM-21' },
  });
  if (!hmTask) {
    hmTask = await p.task.create({
      data: {
        projectId: hiddenMe.id,
        creatorId: admin.id,
        assigneeId: anjana.id,
        taskNumber: 21,
        humanId: 'HM-21',
        checklistCode: 'PD-21',
        title: 'Backend / API Integration',
        description: 'Core backend service integration and API contract verification.',
        workstream: 'DEVELOPMENT',
        workType: 'STANDARD_CHECKLIST',
        checklistPhase: '5. Core Development',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        progress: 60,
        dueDate: new Date('2026-09-19T00:00:00Z'),
      },
    });
    console.log('Created HM-21 (IN_PROGRESS) for Anjana');
  } else {
    await p.task.update({
      where: { id: hmTask.id },
      data: {
        assigneeId: anjana.id,
        status: 'IN_PROGRESS',
        progress: 60,
        dueDate: new Date('2026-09-19T00:00:00Z'),
      },
    });
  }

  // 2. Ensure GradPortraits exists
  let grad = await p.project.findFirst({ where: { name: 'GradPortraits' } });
  if (!grad) {
    grad = await p.project.create({
      data: {
        name: 'GradPortraits',
        key: 'GP',
        description: 'Graduation portrait platform and store',
        projectManagerId: admin.id,
        targetDate: new Date('2026-10-25T00:00:00Z'),
        status: 'ACTIVE',
        health: 'ON_TRACK',
      },
    });
    console.log('Created project GradPortraits');
  }

  // Ensure Anjana is member of GradPortraits
  const gpMember = await p.projectMember.findFirst({
    where: { projectId: grad.id, userId: anjana.id },
  });
  if (!gpMember) {
    await p.projectMember.create({
      data: { projectId: grad.id, userId: anjana.id, role: 'CONTRIBUTOR' },
    });
    console.log('Added Anjana to GradPortraits');
  }

  // Ensure GradPortraits has 2 READY marketing tasks for Anjana
  const gpTasks = [
    {
      num: 1,
      humanId: 'GP-01',
      code: 'MI-01',
      title: 'Confirm portrait package pricing and branding identity',
      phase: 'Identity',
    },
    {
      num: 2,
      humanId: 'GP-02',
      code: 'MI-02',
      title: 'Setup official studio booking Instagram account',
      phase: 'Social Channels',
    },
  ];

  for (const t of gpTasks) {
    const existing = await p.task.findFirst({
      where: { projectId: grad.id, humanId: t.humanId },
    });
    if (!existing) {
      await p.task.create({
        data: {
          projectId: grad.id,
          creatorId: admin.id,
          assigneeId: anjana.id,
          taskNumber: t.num,
          humanId: t.humanId,
          checklistCode: t.code,
          title: t.title,
          workstream: 'MARKETING',
          workType: 'STANDARD_CHECKLIST',
          checklistPhase: t.phase,
          priority: 'MEDIUM',
          status: 'READY',
          progress: 0,
          dueDate: new Date('2026-09-22T00:00:00Z'),
        },
      });
      console.log(`Created ${t.humanId} (READY) for Anjana in GradPortraits`);
    } else {
      await p.task.update({
        where: { id: existing.id },
        data: { assigneeId: anjana.id, status: 'READY' },
      });
    }
  }

  // 3. Ensure Walawwa Game has 1 IN_REVIEW development task for Anjana
  const walawwa = await p.project.findFirst({ where: { name: 'Walawwa Game' } });
  if (walawwa) {
    // Ensure membership
    const wwMember = await p.projectMember.findFirst({
      where: { projectId: walawwa.id, userId: anjana.id },
    });
    if (!wwMember) {
      await p.projectMember.create({
        data: { projectId: walawwa.id, userId: anjana.id, role: 'CONTRIBUTOR' },
      });
    }

    let wwTask = await p.task.findFirst({
      where: { projectId: walawwa.id, humanId: 'WW-08' },
    });
    if (!wwTask) {
      wwTask = await p.task.create({
        data: {
          projectId: walawwa.id,
          creatorId: admin.id,
          assigneeId: anjana.id,
          taskNumber: 8,
          humanId: 'WW-08',
          checklistCode: 'PD-08',
          title: 'Implement player movement and inventory mechanics',
          workstream: 'DEVELOPMENT',
          workType: 'STANDARD_CHECKLIST',
          checklistPhase: '5. Core Development',
          priority: 'HIGH',
          status: 'IN_REVIEW',
          progress: 100,
        },
      });
      console.log('Created WW-08 (IN_REVIEW) for Anjana in Walawwa Game');
    } else {
      await p.task.update({
        where: { id: wwTask.id },
        data: { assigneeId: anjana.id, status: 'IN_REVIEW' },
      });
    }
  }

  console.log('Multi-project test scenario ready!');
  await p.$disconnect();
}

main().catch(console.error);
