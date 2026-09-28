-- Marketing operations are owned by explicit Product roles, never by job title.
UPDATE "JobRole"
SET "name" = 'Marketing Head', "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'MARKETING_MANAGER';

INSERT INTO "JobRole" ("id", "code", "name", "category", "isActive", "createdAt", "updatedAt")
VALUES ('fx-role-marketing-coordinator', 'MARKETING_COORDINATOR', 'Marketing Coordinator', 'MARKETING', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name", "category" = EXCLUDED."category", "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ChecklistEligibleRole" ("checklistTemplateItemId", "functionalRoleId", "isPrimary")
SELECT "id", 'fx-role-marketing-coordinator', false
FROM "ChecklistTemplateItem"
WHERE "workstream" = 'MARKETING'
ON CONFLICT DO NOTHING;

ALTER TABLE "MarketingChannel" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "MarketingChannel"
ADD CONSTRAINT "MarketingChannel_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "MarketingChannel_ownerId_idx" ON "MarketingChannel"("ownerId");
