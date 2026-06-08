-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM (
  'LOGIN_SUCCESS',
  'LOGIN_FAIL',
  'PRACTICE_CREATE',
  'PRACTICE_DELETE',
  'PROFILE_UPDATE',
  'ADMIN_USER_STATUS_CHANGE'
);

-- CreateTable
CREATE TABLE "audit_logs" (
  "id"         TEXT        NOT NULL,
  "userId"     TEXT,
  "action"     "AuditAction" NOT NULL,
  "meta"       JSONB       NOT NULL DEFAULT '{}',
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx"
  ON "audit_logs"("userId", "createdAt" DESC);

CREATE INDEX "audit_logs_action_createdAt_idx"
  ON "audit_logs"("action", "createdAt" DESC);
