-- Remove legacy active Marketing assignments whose assignee has no active
-- Marketing Project Role. Completed ownership remains untouched as history.
WITH "InvalidMarketingAssignment" AS (
  SELECT
    task."id" AS "taskId",
    task."assigneeId" AS "previousAssigneeId",
    task."projectId",
    project."projectManagerId" AS "changedById"
  FROM "Task" task
  JOIN "Project" project ON project."id" = task."projectId"
  WHERE task."deletedAt" IS NULL
    AND task."workstream" = 'MARKETING'
    AND task."assigneeId" IS NOT NULL
    AND task."status" NOT IN ('DONE', 'CANCELED', 'N_A')
    AND NOT EXISTS (
      SELECT 1
      FROM "ProjectMember" member
      JOIN "ProjectMemberRoleAssignment" assignment
        ON assignment."projectMemberId" = member."id"
      JOIN "JobRole" role
        ON role."id" = assignment."functionalRoleId"
      WHERE member."projectId" = task."projectId"
        AND member."userId" = task."assigneeId"
        AND role."isActive" = true
        AND role."code" IN (
          'MARKETING_MANAGER',
          'MARKETING_EXECUTIVE',
          'MARKETING_COORDINATOR'
        )
    )
)
INSERT INTO "TaskAssignmentHistory" (
  "id",
  "taskId",
  "previousAssigneeId",
  "newAssigneeId",
  "changedById",
  "reason",
  "changedAt"
)
SELECT
  gen_random_uuid(),
  invalid."taskId",
  invalid."previousAssigneeId",
  NULL,
  invalid."changedById",
  'System repair: assignee did not have an eligible Marketing Project Role',
  CURRENT_TIMESTAMP
FROM "InvalidMarketingAssignment" invalid
WHERE invalid."changedById" IS NOT NULL;

WITH "InvalidMarketingAssignment" AS (
  SELECT
    task."id" AS "taskId",
    task."assigneeId" AS "previousAssigneeId",
    task."projectId",
    project."projectManagerId" AS "actorId"
  FROM "Task" task
  JOIN "Project" project ON project."id" = task."projectId"
  WHERE task."deletedAt" IS NULL
    AND task."workstream" = 'MARKETING'
    AND task."assigneeId" IS NOT NULL
    AND task."status" NOT IN ('DONE', 'CANCELED', 'N_A')
    AND NOT EXISTS (
      SELECT 1
      FROM "ProjectMember" member
      JOIN "ProjectMemberRoleAssignment" assignment
        ON assignment."projectMemberId" = member."id"
      JOIN "JobRole" role
        ON role."id" = assignment."functionalRoleId"
      WHERE member."projectId" = task."projectId"
        AND member."userId" = task."assigneeId"
        AND role."isActive" = true
        AND role."code" IN (
          'MARKETING_MANAGER',
          'MARKETING_EXECUTIVE',
          'MARKETING_COORDINATOR'
        )
    )
)
INSERT INTO "AuditLog" (
  "id",
  "actorId",
  "action",
  "entityType",
  "entityId",
  "detailsJson",
  "createdAt"
)
SELECT
  gen_random_uuid(),
  invalid."actorId",
  'TASK_REASSIGNED',
  'Task',
  invalid."taskId",
  json_build_object(
    'projectId', invalid."projectId",
    'oldAssigneeId', invalid."previousAssigneeId",
    'newAssigneeId', NULL,
    'reason', 'System repair: ineligible Marketing Project Role'
  )::text,
  CURRENT_TIMESTAMP
FROM "InvalidMarketingAssignment" invalid;

UPDATE "Task" task
SET
  "assigneeId" = NULL,
  "status" = 'UNASSIGNED',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE task."deletedAt" IS NULL
  AND task."workstream" = 'MARKETING'
  AND task."assigneeId" IS NOT NULL
  AND task."status" NOT IN ('DONE', 'CANCELED', 'N_A')
  AND NOT EXISTS (
    SELECT 1
    FROM "ProjectMember" member
    JOIN "ProjectMemberRoleAssignment" assignment
      ON assignment."projectMemberId" = member."id"
    JOIN "JobRole" role
      ON role."id" = assignment."functionalRoleId"
    WHERE member."projectId" = task."projectId"
      AND member."userId" = task."assigneeId"
      AND role."isActive" = true
      AND role."code" IN (
        'MARKETING_MANAGER',
        'MARKETING_EXECUTIVE',
        'MARKETING_COORDINATOR'
      )
  );
