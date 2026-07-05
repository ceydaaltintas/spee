ALTER TABLE "Team" ADD COLUMN "joinCode" TEXT;
UPDATE "Team" SET "joinCode" = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6)) WHERE "joinCode" IS NULL;
ALTER TABLE "Team" ALTER COLUMN "joinCode" SET NOT NULL;
CREATE UNIQUE INDEX "Team_joinCode_key" ON "Team"("joinCode");
