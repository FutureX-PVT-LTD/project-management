-- Repair memberships created before Product Roles were persisted consistently.
-- Only empty memberships are backfilled, so intentional per-Product role choices remain unchanged.
INSERT INTO "ProjectMemberRoleAssignment" (
  "projectMemberId",
  "functionalRoleId",
  "assignedAt"
)
SELECT
  pm."id",
  ufr."functionalRoleId",
  CURRENT_TIMESTAMP
FROM "ProjectMember" pm
JOIN "UserFunctionalRole" ufr ON ufr."userId" = pm."userId"
JOIN "JobRole" role ON role."id" = ufr."functionalRoleId" AND role."isActive" = true
WHERE NOT EXISTS (
  SELECT 1
  FROM "ProjectMemberRoleAssignment" existing
  WHERE existing."projectMemberId" = pm."id"
)
ON CONFLICT DO NOTHING;
