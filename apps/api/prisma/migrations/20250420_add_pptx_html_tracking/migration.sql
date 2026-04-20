-- Add htmlContent column to Material table
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "htmlContent" TEXT;

-- Create MaterialReadingProgress table
CREATE TABLE IF NOT EXISTS "MaterialReadingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "totalTime" INTEGER NOT NULL DEFAULT 0,
    "slideStatuses" JSONB,
    "slideTimeSpent" JSONB,
    "completedSlides" INTEGER NOT NULL DEFAULT 0,
    "totalSlides" INTEGER NOT NULL DEFAULT 0,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialReadingProgress_pkey" PRIMARY KEY ("id")
);

-- Create unique index for user + material combination
CREATE UNIQUE INDEX IF NOT EXISTS "MaterialReadingProgress_userId_materialId_key" 
ON "MaterialReadingProgress"("userId", "materialId");

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS "MaterialReadingProgress_userId_idx" ON "MaterialReadingProgress"("userId");
CREATE INDEX IF NOT EXISTS "MaterialReadingProgress_materialId_idx" ON "MaterialReadingProgress"("materialId");

-- Add foreign key constraints
ALTER TABLE "MaterialReadingProgress" 
    ADD CONSTRAINT "MaterialReadingProgress_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MaterialReadingProgress" 
    ADD CONSTRAINT "MaterialReadingProgress_materialId_fkey" 
    FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
