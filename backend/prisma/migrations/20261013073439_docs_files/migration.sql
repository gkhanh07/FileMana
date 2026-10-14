-- CreateEnum
CREATE TYPE "ItemKind" AS ENUM ('FOLDER', 'DOC', 'FILE');

-- AlterTable
ALTER TABLE "Activity" ALTER COLUMN "projectId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Item" (
    "id" UUID NOT NULL,
    "kind" "ItemKind" NOT NULL,
    "name" VARCHAR(255) COLLATE "vi-x-icu" NOT NULL,
    "parentId" UUID,
    "projectId" UUID,
    "taskId" UUID,
    "creatorId" UUID,
    "mimeType" VARCHAR(255),
    "size" INTEGER,
    "content" JSONB,
    "version" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_projectId_key" ON "Item"("projectId");

-- CreateIndex
CREATE INDEX "Item_parentId_idx" ON "Item"("parentId");

-- CreateIndex
CREATE INDEX "Item_taskId_idx" ON "Item"("taskId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The roots (FR-FILE-01): the General folder, and a folder for every existing project.
INSERT INTO "Item" ("id", "kind", "name", "updatedAt") VALUES (gen_random_uuid(), 'FOLDER', 'Chung', now());
INSERT INTO "Item" ("id", "kind", "name", "projectId", "updatedAt")
SELECT gen_random_uuid(), 'FOLDER', "name", "id", now() FROM "Project";
