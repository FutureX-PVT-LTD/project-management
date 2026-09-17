CREATE TABLE "ProjectPhaseAssignment" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "workstream" TEXT NOT NULL,
  "phaseKey" TEXT NOT NULL,
  "defaultAssigneeId" TEXT,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectPhaseAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectPhaseMember" (
  "phaseAssignmentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectPhaseMember_pkey" PRIMARY KEY ("phaseAssignmentId", "userId")
);

CREATE UNIQUE INDEX "ProjectPhaseAssignment_projectId_workstream_phaseKey_key"
  ON "ProjectPhaseAssignment"("projectId", "workstream", "phaseKey");
CREATE INDEX "ProjectPhaseAssignment_projectId_workstream_idx"
  ON "ProjectPhaseAssignment"("projectId", "workstream");
CREATE INDEX "ProjectPhaseAssignment_defaultAssigneeId_idx"
  ON "ProjectPhaseAssignment"("defaultAssigneeId");
CREATE INDEX "ProjectPhaseMember_userId_idx" ON "ProjectPhaseMember"("userId");

ALTER TABLE "ProjectPhaseAssignment" ADD CONSTRAINT "ProjectPhaseAssignment_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectPhaseAssignment" ADD CONSTRAINT "ProjectPhaseAssignment_defaultAssigneeId_fkey"
  FOREIGN KEY ("defaultAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectPhaseAssignment" ADD CONSTRAINT "ProjectPhaseAssignment_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectPhaseAssignment" ADD CONSTRAINT "ProjectPhaseAssignment_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectPhaseMember" ADD CONSTRAINT "ProjectPhaseMember_phaseAssignmentId_fkey"
  FOREIGN KEY ("phaseAssignmentId") REFERENCES "ProjectPhaseAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectPhaseMember" ADD CONSTRAINT "ProjectPhaseMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
