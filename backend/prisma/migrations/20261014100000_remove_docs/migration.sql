-- FR-DOC-01..05 moved to Later (2026-10-14): docs, what was inserted into them, and their activity go.
DELETE FROM "Activity" WHERE "action" IN ('doc.created', 'doc.edited');
DELETE FROM "Item" WHERE "kind" = 'DOC';

ALTER TABLE "Item" DROP COLUMN "content", DROP COLUMN "version";

ALTER TYPE "ItemKind" RENAME TO "ItemKind_old";
CREATE TYPE "ItemKind" AS ENUM ('FOLDER', 'FILE');
ALTER TABLE "Item" ALTER COLUMN "kind" TYPE "ItemKind" USING ("kind"::text::"ItemKind");
DROP TYPE "ItemKind_old";
