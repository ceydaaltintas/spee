-- CreateEnum
CREATE TYPE "SourceSystem" AS ENUM ('JIRA', 'ADO');

-- CreateEnum
CREATE TYPE "Technique" AS ENUM ('FIBONACCI', 'MODIFIED_FIBONACCI', 'TSHIRT', 'POWERS_OF_TWO', 'LINEAR', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('USER_STORY', 'BUG', 'ANALYSIS', 'TEST_TASK', 'DESIGN', 'DEVOPS', 'SPIKE', 'SUB_TASK');

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceSystem" "SourceSystem" NOT NULL,
    "activeTechnique" "Technique" NOT NULL DEFAULT 'FIBONACCI',
    "velocityAvg" DOUBLE PRECISION,
    "lastCalibratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamConfig" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "customThresholds" JSONB,
    "calibrationLog" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamWeight" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "taskType" "TaskType" NOT NULL,
    "criteriaKey" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TeamWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkItemCache" (
    "id" TEXT NOT NULL,
    "sourceSystem" "SourceSystem" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rawPayload" JSONB NOT NULL,
    "acCount" INTEGER,
    "extractedSignals" JSONB,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkItemCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimationResult" (
    "id" TEXT NOT NULL,
    "workItemCacheId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "taskType" "TaskType" NOT NULL,
    "technique" "Technique" NOT NULL,
    "ruleBasedScore" DOUBLE PRECISION NOT NULL,
    "ruleBasedSP" INTEGER NOT NULL,
    "cbrSP" INTEGER,
    "cbrSimilarity" DOUBLE PRECISION,
    "ensembleSP" INTEGER,
    "suggestedSP" INTEGER NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "confidenceLow" INTEGER,
    "confidenceHigh" INTEGER,
    "criteriaSnapshot" JSONB NOT NULL,
    "approvedSP" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActualOutcome" (
    "id" TEXT NOT NULL,
    "estimationResultId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "plannedSP" INTEGER NOT NULL,
    "actualHours" DOUBLE PRECISION,
    "completedInSprint" BOOLEAN NOT NULL,
    "reopenCount" INTEGER NOT NULL DEFAULT 0,
    "spilloverCount" INTEGER NOT NULL DEFAULT 0,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActualOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamConfig_teamId_key" ON "TeamConfig"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamWeight_teamId_taskType_criteriaKey_key" ON "TeamWeight"("teamId", "taskType", "criteriaKey");

-- CreateIndex
CREATE UNIQUE INDEX "WorkItemCache_sourceSystem_sourceId_teamId_key" ON "WorkItemCache"("sourceSystem", "sourceId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ActualOutcome_estimationResultId_key" ON "ActualOutcome"("estimationResultId");

-- AddForeignKey
ALTER TABLE "TeamConfig" ADD CONSTRAINT "TeamConfig_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamWeight" ADD CONSTRAINT "TeamWeight_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimationResult" ADD CONSTRAINT "EstimationResult_workItemCacheId_fkey" FOREIGN KEY ("workItemCacheId") REFERENCES "WorkItemCache"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimationResult" ADD CONSTRAINT "EstimationResult_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualOutcome" ADD CONSTRAINT "ActualOutcome_estimationResultId_fkey" FOREIGN KEY ("estimationResultId") REFERENCES "EstimationResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualOutcome" ADD CONSTRAINT "ActualOutcome_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
