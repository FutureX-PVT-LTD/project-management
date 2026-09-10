CREATE TABLE "AdditionalWork" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "workDate" DATE NOT NULL,
  "minutesSpent" INTEGER,
  "source" TEXT NOT NULL DEFAULT 'MEMBER_ADDITIONAL_WORK',
  "countsTowardProductProgress" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdditionalWork_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AdditionalWork_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AdditionalWork_minutes_check" CHECK ("minutesSpent" IS NULL OR "minutesSpent" BETWEEN 1 AND 1440),
  CONSTRAINT "AdditionalWork_scope_check" CHECK ("source" = 'MEMBER_ADDITIONAL_WORK' AND "countsTowardProductProgress" = false)
);
CREATE INDEX "AdditionalWork_creatorId_workDate_idx" ON "AdditionalWork"("creatorId", "workDate");
CREATE INDEX "AdditionalWork_projectId_workDate_idx" ON "AdditionalWork"("projectId", "workDate");
