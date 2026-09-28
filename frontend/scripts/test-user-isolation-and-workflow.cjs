const assert = require('assert');
const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function testUserIsolation() {
  console.log('Testing User Isolation and Board Scoping...');

  const anjana = await prisma.user.findFirst({ where: { email: 'anjanaimesh600@gmail.com' } });
  const yasindu = await prisma.user.findFirst({ where: { email: 'yasindu@futurex.lk' } });

  assert(anjana, 'Anjana must exist in database');
  assert(yasindu, 'Yasindu must exist in database');

  // Query Anjana's tasks
  const anjanaTasks = await prisma.task.findMany({
    where: {
      deletedAt: null,
      OR: [{ assigneeId: anjana.id }, { collaborators: { some: { userId: anjana.id } } }],
    },
    include: {
      project: { select: { id: true, key: true, name: true } },
    },
  });

  // Query Yasindu's tasks
  const yasinduTasks = await prisma.task.findMany({
    where: {
      deletedAt: null,
      OR: [{ assigneeId: yasindu.id }, { collaborators: { some: { userId: yasindu.id } } }],
    },
    include: {
      project: { select: { id: true, key: true, name: true } },
    },
  });

  console.log(`Anjana has ${anjanaTasks.length} assigned deliverables`);
  console.log(`Yasindu has ${yasinduTasks.length} assigned deliverables`);

  // Verify Anjana only gets tasks assigned to Anjana
  anjanaTasks.forEach(task => {
    assert(
      task.assigneeId === anjana.id,
      `Task ${task.humanId} must be assigned to Anjana (${anjana.id}), got ${task.assigneeId}`
    );
  });

  // Verify Yasindu only gets tasks assigned to Yasindu
  yasinduTasks.forEach(task => {
    assert(
      task.assigneeId === yasindu.id,
      `Task ${task.humanId} must be assigned to Yasindu (${yasindu.id}), got ${task.assigneeId}`
    );
  });

  // Verify zero cross-user task overlap
  const anjanaTaskIds = new Set(anjanaTasks.map(t => t.id));
  const yasinduTaskIds = new Set(yasinduTasks.map(t => t.id));

  for (const id of anjanaTaskIds) {
    assert(!yasinduTaskIds.has(id), `Task ${id} must not appear on both users' boards`);
  }

  console.log('✅ User data isolation verified: zero cross-user leakage!');

  // Verify Multi-Project context in Anjana's tasks
  const projectNames = [...new Set(anjanaTasks.map(t => t.project?.name).filter(Boolean))];
  console.log('Projects represented in Anjana work:', projectNames);
  assert(projectNames.length >= 2, 'Anjana should have tasks across multiple projects');

  // Verify Workstream context in Anjana's tasks
  const workstreams = [...new Set(anjanaTasks.map(t => t.workstream || 'DEVELOPMENT'))];
  console.log('Workstreams represented in Anjana work:', workstreams);
  assert(workstreams.includes('DEVELOPMENT'), 'Must have Development deliverables');
  assert(workstreams.includes('MARKETING'), 'Must have Marketing deliverables');

  console.log('✅ Multi-project and multi-workstream contexts confirmed!');

  await prisma.$disconnect();
  console.log('All user isolation & board data tests passed successfully!');
}

testUserIsolation().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
