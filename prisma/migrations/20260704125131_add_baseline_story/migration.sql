-- CreateTable
CREATE TABLE "BaselineStory" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "taskType" "TaskType",
    "title" TEXT NOT NULL,
    "description" TEXT,
    "storyPoints" INTEGER NOT NULL,
    "compDevelopment" DOUBLE PRECISION,
    "compAnalysis" DOUBLE PRECISION,
    "compTesting" DOUBLE PRECISION,
    "compDesign" DOUBLE PRECISION,
    "compDevops" DOUBLE PRECISION,
    "criteriaSnapshot" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaselineStory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BaselineStory" ADD CONSTRAINT "BaselineStory_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
