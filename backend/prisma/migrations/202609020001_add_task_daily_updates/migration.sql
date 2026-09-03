CREATE TABLE "TaskDailyUpdate" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "progressBefore" INTEGER NOT NULL,
  "progressAfter" INTEGER NOT NULL,
  "completedToday" TEXT NOT NULL,
  "blocker" TEXT,
  "nextStep" TEXT NOT NULL,
  "attachmentId" TEXT,
  "workDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaskDailyUpdate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskDailyUpdate_taskId_userId_workDate_key"
  ON "TaskDailyUpdate"("taskId", "userId", "workDate");

CREATE INDEX "TaskDailyUpdate_taskId_createdAt_idx"
  ON "TaskDailyUpdate"("taskId", "createdAt");

CREATE INDEX "TaskDailyUpdate_projectId_createdAt_idx"
  ON "TaskDailyUpdate"("projectId", "createdAt");

CREATE INDEX "TaskDailyUpdate_userId_createdAt_idx"
  ON "TaskDailyUpdate"("userId", "createdAt");

ALTER TABLE "TaskDailyUpdate"
  ADD CONSTRAINT "TaskDailyUpdate_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskDailyUpdate"
  ADD CONSTRAINT "TaskDailyUpdate_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TaskDailyUpdate"
  ADD CONSTRAINT "TaskDailyUpdate_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TaskDailyUpdate"
  ADD CONSTRAINT "TaskDailyUpdate_attachmentId_fkey"
  FOREIGN KEY ("attachmentId") REFERENCES "TaskAttachment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
