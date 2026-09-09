ALTER TABLE "Session" ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- Tokens issued before session-bound access credentials must require a fresh login.
UPDATE "Session" SET "isRevoked" = true;
