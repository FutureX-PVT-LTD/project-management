ALTER TABLE "Project" ADD COLUMN "marketingOwnerId" TEXT;
ALTER TABLE "Project" ADD COLUMN "targetMarket" TEXT;
ALTER TABLE "Project" ADD COLUMN "targetLanguage" TEXT;
ALTER TABLE "Task" ADD COLUMN "workstream" TEXT NOT NULL DEFAULT 'DEVELOPMENT';
ALTER TABLE "ChecklistTemplateItem" ADD COLUMN "workstream" TEXT NOT NULL DEFAULT 'DEVELOPMENT';
ALTER TABLE "ChecklistTemplateItem" ADD COLUMN "sourceConfirmed" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AdditionalWork" ADD COLUMN "workstream" TEXT NOT NULL DEFAULT 'DEVELOPMENT';

CREATE TABLE "ProjectWorkstream" (
  "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "workstream" TEXT NOT NULL,
  "templateVersion" TEXT, "status" TEXT NOT NULL DEFAULT 'SETUP', "generatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectWorkstream_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectWorkstream_projectId_workstream_key" ON "ProjectWorkstream"("projectId", "workstream");
CREATE INDEX "ProjectWorkstream_workstream_status_idx" ON "ProjectWorkstream"("workstream", "status");

CREATE TABLE "MarketingChannel" (
  "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "code" TEXT NOT NULL, "platform" TEXT NOT NULL,
  "requirement" TEXT NOT NULL DEFAULT 'WHEN_APPLICABLE', "handle" TEXT, "publicUrl" TEXT, "adminEmail" TEXT,
  "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false, "backupAdminId" TEXT, "status" TEXT NOT NULL DEFAULT 'NOT_CREATED',
  "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingChannel_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketingChannel_projectId_code_key" ON "MarketingChannel"("projectId", "code");
CREATE INDEX "MarketingChannel_projectId_status_idx" ON "MarketingChannel"("projectId", "status");

CREATE TABLE "MarketingContentItem" (
  "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "code" TEXT NOT NULL, "stage" TEXT NOT NULL,
  "contentType" TEXT NOT NULL, "concept" TEXT NOT NULL, "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[], "ownerId" TEXT,
  "assetStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED', "postStatus" TEXT NOT NULL DEFAULT 'NOT_POSTED', "assetLink" TEXT,
  "notes" TEXT, "targetDate" TIMESTAMP(3), "scheduledDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingContentItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketingContentItem_projectId_code_key" ON "MarketingContentItem"("projectId", "code");
CREATE INDEX "MarketingContentItem_projectId_assetStatus_idx" ON "MarketingContentItem"("projectId", "assetStatus");
CREATE INDEX "MarketingContentItem_ownerId_idx" ON "MarketingContentItem"("ownerId");

CREATE TABLE "MarketingBuzzActivity" (
  "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "code" TEXT NOT NULL, "stage" TEXT NOT NULL, "objective" TEXT NOT NULL,
  "startOffsetDays" INTEGER NOT NULL, "endOffsetDays" INTEGER NOT NULL, "startDate" TIMESTAMP(3) NOT NULL, "endDate" TIMESTAMP(3) NOT NULL,
  "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[], "ownerId" TEXT, "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingBuzzActivity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketingBuzzActivity_projectId_code_key" ON "MarketingBuzzActivity"("projectId", "code");
CREATE INDEX "MarketingBuzzActivity_projectId_startDate_idx" ON "MarketingBuzzActivity"("projectId", "startDate");
CREATE INDEX "MarketingBuzzActivity_ownerId_idx" ON "MarketingBuzzActivity"("ownerId");

CREATE TABLE "MarketingGate" (
  "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "requirement" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NOT_READY', "approvedById" TEXT, "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingGate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketingGate_projectId_code_key" ON "MarketingGate"("projectId", "code");
CREATE INDEX "MarketingGate_projectId_status_idx" ON "MarketingGate"("projectId", "status");

CREATE TABLE "MarketingSignoffItem" (
  "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "code" TEXT NOT NULL, "checkName" TEXT NOT NULL, "requirement" TEXT NOT NULL,
  "marketingCheck" TEXT NOT NULL DEFAULT 'PENDING', "pmCheck" TEXT NOT NULL DEFAULT 'PENDING', "issueGap" TEXT, "ownerId" TEXT,
  "targetFixDate" TIMESTAMP(3), "finalStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingSignoffItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketingSignoffItem_projectId_code_key" ON "MarketingSignoffItem"("projectId", "code");
CREATE INDEX "MarketingSignoffItem_projectId_finalStatus_idx" ON "MarketingSignoffItem"("projectId", "finalStatus");

ALTER TABLE "Project" ADD CONSTRAINT "Project_marketingOwnerId_fkey" FOREIGN KEY ("marketingOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectWorkstream" ADD CONSTRAINT "ProjectWorkstream_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingChannel" ADD CONSTRAINT "MarketingChannel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingChannel" ADD CONSTRAINT "MarketingChannel_backupAdminId_fkey" FOREIGN KEY ("backupAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketingContentItem" ADD CONSTRAINT "MarketingContentItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingContentItem" ADD CONSTRAINT "MarketingContentItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketingBuzzActivity" ADD CONSTRAINT "MarketingBuzzActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingBuzzActivity" ADD CONSTRAINT "MarketingBuzzActivity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketingGate" ADD CONSTRAINT "MarketingGate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingGate" ADD CONSTRAINT "MarketingGate_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketingSignoffItem" ADD CONSTRAINT "MarketingSignoffItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingSignoffItem" ADD CONSTRAINT "MarketingSignoffItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Project_marketingOwnerId_idx" ON "Project"("marketingOwnerId");
CREATE INDEX "Task_workstream_idx" ON "Task"("workstream");
CREATE INDEX "ChecklistTemplateItem_workstream_idx" ON "ChecklistTemplateItem"("workstream");

INSERT INTO "ProjectWorkstream" ("id", "projectId", "workstream", "templateVersion", "status", "generatedAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'DEVELOPMENT', "checklistTemplateVersion", 'ACTIVE', "checklistGeneratedAt", CURRENT_TIMESTAMP
FROM "Project" WHERE "checklistGeneratedAt" IS NOT NULL
ON CONFLICT ("projectId", "workstream") DO NOTHING;
