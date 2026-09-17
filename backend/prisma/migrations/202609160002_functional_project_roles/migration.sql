-- Additive role architecture migration. Existing users, projects, tasks and audit rows are retained.
ALTER TABLE "JobRole" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "JobRole" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "JobRole" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "JobRole" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "JobRole"
SET "code" = UPPER(REGEXP_REPLACE(TRIM("name"), '[^A-Za-z0-9]+', '_', 'g')),
    "category" = COALESCE("category", 'ENGINEERING')
WHERE "code" IS NULL;

INSERT INTO "JobRole" ("id", "code", "name", "category", "isActive", "createdAt", "updatedAt") VALUES
('fx-role-project-manager','PROJECT_MANAGER','Project Manager','MANAGEMENT',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('fx-role-lead-developer','LEAD_DEVELOPER','Lead Developer','ENGINEERING',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('fx-role-developer','DEVELOPER','Developer','ENGINEERING',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('fx-role-ui-ux-designer','UI_UX_DESIGNER','UI/UX Designer','DESIGN',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('fx-role-3d-artist','THREE_D_ARTIST','3D Artist','DESIGN',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('fx-role-qa-engineer','QA_ENGINEER','QA Engineer','QUALITY',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('fx-role-marketing-manager','MARKETING_MANAGER','Marketing Manager','MARKETING',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('fx-role-marketing-executive','MARKETING_EXECUTIVE','Marketing Executive','MARKETING',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('fx-role-marketing-designer','MARKETING_DESIGNER','Marketing Designer','DESIGN',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('fx-role-content-creator','CONTENT_CREATOR','Content Creator','CONTENT',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS "JobRole_code_key" ON "JobRole"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "JobRole_name_category_key" ON "JobRole"("name", "category");
CREATE INDEX IF NOT EXISTS "JobRole_category_isActive_idx" ON "JobRole"("category", "isActive");
ALTER TABLE "JobRole" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "JobRole" ALTER COLUMN "category" SET NOT NULL;

CREATE TABLE "UserFunctionalRole" (
  "userId" TEXT NOT NULL,
  "functionalRoleId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserFunctionalRole_pkey" PRIMARY KEY ("userId", "functionalRoleId"),
  CONSTRAINT "UserFunctionalRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserFunctionalRole_functionalRoleId_fkey" FOREIGN KEY ("functionalRoleId") REFERENCES "JobRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "UserFunctionalRole_functionalRoleId_idx" ON "UserFunctionalRole"("functionalRoleId");
INSERT INTO "UserFunctionalRole" ("userId", "functionalRoleId") SELECT "B", "A" FROM "_JobRoleToUser" ON CONFLICT DO NOTHING;

CREATE TABLE "ProjectMemberRoleAssignment" (
  "projectMemberId" TEXT NOT NULL,
  "functionalRoleId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectMemberRoleAssignment_pkey" PRIMARY KEY ("projectMemberId", "functionalRoleId"),
  CONSTRAINT "ProjectMemberRoleAssignment_projectMemberId_fkey" FOREIGN KEY ("projectMemberId") REFERENCES "ProjectMember"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectMemberRoleAssignment_functionalRoleId_fkey" FOREIGN KEY ("functionalRoleId") REFERENCES "JobRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ProjectMemberRoleAssignment_functionalRoleId_idx" ON "ProjectMemberRoleAssignment"("functionalRoleId");

-- Existing managing admins become explicit Product members with Project Manager capability.
INSERT INTO "ProjectMember" ("id", "projectId", "userId", "role", "joinedAt")
SELECT CONCAT('manager-', p."id"), p."id", p."projectManagerId", 'MANAGER', CURRENT_TIMESTAMP
FROM "Project" p WHERE p."projectManagerId" IS NOT NULL
ON CONFLICT ("projectId", "userId") DO NOTHING;
INSERT INTO "UserFunctionalRole" ("userId", "functionalRoleId")
SELECT DISTINCT p."projectManagerId", 'fx-role-project-manager' FROM "Project" p WHERE p."projectManagerId" IS NOT NULL ON CONFLICT DO NOTHING;
INSERT INTO "ProjectMemberRoleAssignment" ("projectMemberId", "functionalRoleId")
SELECT pm."id", 'fx-role-project-manager' FROM "ProjectMember" pm JOIN "Project" p ON p."id"=pm."projectId" AND p."projectManagerId"=pm."userId" ON CONFLICT DO NOTHING;

CREATE TABLE "ChecklistEligibleRole" (
  "checklistTemplateItemId" TEXT NOT NULL,
  "functionalRoleId" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "ChecklistEligibleRole_pkey" PRIMARY KEY ("checklistTemplateItemId", "functionalRoleId"),
  CONSTRAINT "ChecklistEligibleRole_checklistTemplateItemId_fkey" FOREIGN KEY ("checklistTemplateItemId") REFERENCES "ChecklistTemplateItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ChecklistEligibleRole_functionalRoleId_fkey" FOREIGN KEY ("functionalRoleId") REFERENCES "JobRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ChecklistEligibleRole_functionalRoleId_idx" ON "ChecklistEligibleRole"("functionalRoleId");

WITH mapping("ownerRole","roleId","primaryRole") AS (VALUES
('PROJECT_MANAGEMENT','fx-role-project-manager',true),('PROJECT_MANAGER','fx-role-project-manager',true),
('PM_DESIGNER','fx-role-project-manager',true),('PM_DESIGNER','fx-role-ui-ux-designer',false),
('LEAD_DEVELOPER','fx-role-lead-developer',true),('DEVELOPER','fx-role-developer',true),
('DESIGNER','fx-role-ui-ux-designer',true),('DESIGNER_ARTIST','fx-role-ui-ux-designer',true),('DESIGNER_ARTIST','fx-role-3d-artist',false),
('QA_PM','fx-role-qa-engineer',true),('QA_PM','fx-role-project-manager',false),
('MARKETING_PM','fx-role-marketing-manager',true),('MARKETING_PM','fx-role-project-manager',false),
('PM_MARKETING','fx-role-project-manager',true),('PM_MARKETING','fx-role-marketing-manager',false),('PM_MARKETING','fx-role-marketing-executive',false),
('PM_DEVELOPER','fx-role-project-manager',true),('PM_DEVELOPER','fx-role-developer',false),
('DEVELOPER_PM','fx-role-developer',true),('DEVELOPER_PM','fx-role-project-manager',false),
('MARKETING_ASSISTANT','fx-role-marketing-executive',true),('WEB_MARKETING','fx-role-marketing-executive',true),
('MARKETING_TEAM','fx-role-content-creator',true),('MARKETING_TEAM','fx-role-marketing-executive',false),
('MARKETING_LEAD','fx-role-marketing-manager',true),('MARKETING_DESIGNER','fx-role-marketing-designer',true)
)
INSERT INTO "ChecklistEligibleRole" ("checklistTemplateItemId","functionalRoleId","isPrimary")
SELECT c."id", m."roleId", m."primaryRole" FROM "ChecklistTemplateItem" c JOIN mapping m ON m."ownerRole"=c."ownerRole" ON CONFLICT DO NOTHING;

CREATE TABLE "TaskAssignmentHistory" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "previousAssigneeId" TEXT,
  "newAssigneeId" TEXT,
  "changedById" TEXT NOT NULL,
  "reason" TEXT,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskAssignmentHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaskAssignmentHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskAssignmentHistory_previousAssigneeId_fkey" FOREIGN KEY ("previousAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TaskAssignmentHistory_newAssigneeId_fkey" FOREIGN KEY ("newAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TaskAssignmentHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "TaskAssignmentHistory_taskId_changedAt_idx" ON "TaskAssignmentHistory"("taskId", "changedAt");
CREATE INDEX "TaskAssignmentHistory_previousAssigneeId_idx" ON "TaskAssignmentHistory"("previousAssigneeId");
CREATE INDEX "TaskAssignmentHistory_newAssigneeId_idx" ON "TaskAssignmentHistory"("newAssigneeId");

DROP TABLE "_JobRoleToUser";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "marketingTeamIds";
