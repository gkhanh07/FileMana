-- FR-TASK-09: existing tasks keep their creation order.
ALTER TABLE "Task" ADD COLUMN "position" DOUBLE PRECISION;
UPDATE "Task" SET "position" = "number";
ALTER TABLE "Task" ALTER COLUMN "position" SET NOT NULL;
