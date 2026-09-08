-- Product-level metadata while preserving the existing Project table.
ALTER TABLE "Project"
  ADD COLUMN "productType" TEXT NOT NULL DEFAULT 'GAME',
  ADD COLUMN "launchReadiness" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "currentPhase" TEXT,
  ADD COLUMN "checklistGeneratedAt" TIMESTAMP(3),
  ADD COLUMN "checklistTemplateVersion" TEXT;

-- Master development checklist template. Generated live work is stored as Task rows
-- linked back to immutable template rows.
CREATE TABLE "ChecklistTemplateItem" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "phase" TEXT NOT NULL,
  "stage" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "doneWhen" TEXT,
  "mandatory" BOOLEAN NOT NULL DEFAULT true,
  "ownerRole" TEXT NOT NULL,
  "defaultOrder" INTEGER NOT NULL,
  "requiresReview" BOOLEAN NOT NULL DEFAULT false,
  "allowParallelWork" BOOLEAN NOT NULL DEFAULT false,
  "dependencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "applicableTypes" TEXT[] DEFAULT ARRAY['APP','GAME','WEBSITE_TOOL']::TEXT[],
  "targetOffsetDays" INTEGER,
  "templateVersion" TEXT NOT NULL DEFAULT '2026.09',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ChecklistTemplateItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChecklistTemplateItem_code_key" ON "ChecklistTemplateItem"("code");
CREATE INDEX "ChecklistTemplateItem_phase_idx" ON "ChecklistTemplateItem"("phase");
CREATE INDEX "ChecklistTemplateItem_ownerRole_idx" ON "ChecklistTemplateItem"("ownerRole");
CREATE INDEX "ChecklistTemplateItem_defaultOrder_idx" ON "ChecklistTemplateItem"("defaultOrder");
CREATE INDEX "ChecklistTemplateItem_isActive_idx" ON "ChecklistTemplateItem"("isActive");

ALTER TABLE "Task"
  ADD COLUMN "workType" TEXT NOT NULL DEFAULT 'CUSTOM',
  ADD COLUMN "checklistTemplateItemId" TEXT,
  ADD COLUMN "checklistCode" TEXT,
  ADD COLUMN "checklistPhase" TEXT,
  ADD COLUMN "checklistStage" TEXT,
  ADD COLUMN "checklistOwnerRole" TEXT,
  ADD COLUMN "checklistDoneWhen" TEXT,
  ADD COLUMN "checklistMandatory" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "checklistOrder" INTEGER,
  ADD COLUMN "allowParallelWork" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Project_productType_idx" ON "Project"("productType");
CREATE INDEX "Task_workType_idx" ON "Task"("workType");
CREATE INDEX "Task_checklistCode_idx" ON "Task"("checklistCode");
CREATE INDEX "Task_checklistPhase_idx" ON "Task"("checklistPhase");
CREATE INDEX "Task_checklistStage_idx" ON "Task"("checklistStage");
CREATE INDEX "Task_checklistOwnerRole_idx" ON "Task"("checklistOwnerRole");
CREATE INDEX "Task_checklistTemplateItemId_idx" ON "Task"("checklistTemplateItemId");

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_checklistTemplateItemId_fkey"
  FOREIGN KEY ("checklistTemplateItemId") REFERENCES "ChecklistTemplateItem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
