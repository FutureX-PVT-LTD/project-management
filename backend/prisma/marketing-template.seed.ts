import { PrismaClient } from '@prisma/client';
import { marketingChecklistItems, MARKETING_TEMPLATE_VERSION } from '../src/modules/marketing/marketing-template';

export async function seedMarketingChecklist(prisma: PrismaClient) {
  for (const item of marketingChecklistItems) {
    await prisma.checklistTemplateItem.upsert({
      where: { code: item.code },
      update: { ...item, workstream: 'MARKETING', templateVersion: MARKETING_TEMPLATE_VERSION, sourceConfirmed: item.sourceConfirmed, isActive: true },
      create: { ...item, workstream: 'MARKETING', templateVersion: MARKETING_TEMPLATE_VERSION, sourceConfirmed: item.sourceConfirmed, isActive: true },
    });
  }
  return { version: MARKETING_TEMPLATE_VERSION, seededCount: marketingChecklistItems.length, sourceConfirmed: true };
}
