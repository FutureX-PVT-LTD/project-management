import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Update Bus Game key from '''' to BG
  const busProject = await prisma.project.findFirst({
    where: { name: 'Bus Game' },
  });

  if (busProject && (busProject.key === "''''" || busProject.key.includes("'"))) {
    await prisma.project.update({
      where: { id: busProject.id },
      data: { key: 'BG' },
    });
    console.log(`Updated project key to 'BG' for project: ${busProject.name}`);

    // Update tasks humanIds
    const tasks = await prisma.task.findMany({
      where: { projectId: busProject.id },
    });

    for (const t of tasks) {
      if (t.humanId.startsWith("''''-") || t.humanId.includes("'")) {
        const newHumanId = `BG-${t.taskNumber}`;
        await prisma.task.update({
          where: { id: t.id },
          data: { humanId: newHumanId },
        });
        console.log(`Updated task humanId from ${t.humanId} to ${newHumanId}`);
      }
    }
  } else {
    console.log('Project key is already clean or not found:', busProject?.key);
  }
}

main().finally(() => prisma.$disconnect());
