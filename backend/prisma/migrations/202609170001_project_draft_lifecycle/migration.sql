ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "lifecycleStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "currentStep" TEXT DEFAULT 'DETAILS',
  ADD COLUMN IF NOT EXISTS "draftDataJson" TEXT,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedById" TEXT,
  ADD COLUMN IF NOT EXISTS "activationStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Project_lifecycleStatus_idx" ON "Project"("lifecycleStatus");
CREATE INDEX IF NOT EXISTS "Project_createdById_idx" ON "Project"("createdById");
