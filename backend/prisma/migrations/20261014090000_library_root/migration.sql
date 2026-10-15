-- FR-FILE-01 (2026-10-14): General is now the Docs & Files page itself; the root is never listed, only named in breadcrumbs.
UPDATE "Item" SET "name" = 'Tài liệu & tệp' WHERE "parentId" IS NULL AND "projectId" IS NULL;
