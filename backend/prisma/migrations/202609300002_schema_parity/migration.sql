-- Reconcile schema drift without changing existing task or user data.
ALTER TABLE "JobRole" ALTER COLUMN "updatedAt" DROP DEFAULT;
CREATE INDEX IF NOT EXISTS "Task_projectId_status_idx" ON "Task"("projectId", "status");
CREATE INDEX IF NOT EXISTS "Task_assigneeId_status_idx" ON "Task"("assigneeId", "status");
CREATE INDEX IF NOT EXISTS "Task_dueDate_status_idx" ON "Task"("dueDate", "status");
CREATE INDEX IF NOT EXISTS "TaskActivity_createdAt_idx" ON "TaskActivity"("createdAt");
CREATE INDEX IF NOT EXISTS "TaskActivity_projectId_createdAt_idx" ON "TaskActivity"("projectId", "createdAt");
