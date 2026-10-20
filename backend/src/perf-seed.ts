import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';
import { TaskPriority, TaskStatus } from './generated/prisma/enums';
import { assertLocalDb, loadEnv } from './test-db';

// Performance data for NFR-01/02/03: project PERF with 1,000 tasks and 200 subtasks. Local databases only.
// Usage: npm run perf-seed [-- --clean]
const KEY = 'PERF';
const TASKS = 1000;
const SUBTASKS = 200;
const STATUSES = Object.values(TaskStatus);
const PRIORITIES = Object.values(TaskPriority);
const DAY = 86_400_000;

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  assertLocalDb(url);
  const email = process.env.SEED_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error('SEED_EMAIL is not set');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    const existing = await prisma.project.findUnique({ where: { key: KEY } });
    if (process.argv.includes('--clean')) {
      if (existing) await prisma.project.delete({ where: { key: KEY } });
      console.log(existing ? 'Removed project PERF' : 'No project PERF');
      return;
    }
    if (existing) {
      console.log('Project PERF already exists; run with --clean first');
      return;
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const labels = await prisma.label.findMany({ select: { id: true } });
    const today = Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
    );
    const pick = <T>(list: readonly T[], i: number) => list[i % list.length];

    await prisma.$transaction(
      async (tx) => {
        const project = await tx.project.create({
          data: {
            key: KEY,
            name: 'Perf data',
            color: 'slate',
            status: 'ACTIVE',
            ownerId: user.id,
            taskCounter: TASKS + SUBTASKS,
            members: { create: { userId: user.id } },
          },
        });
        await tx.item.create({
          data: { kind: 'FOLDER', name: project.name, projectId: project.id },
        });
        const task = (number: number, parentId?: string) => {
          const status = pick(STATUSES, number);
          return {
            projectId: project.id,
            number,
            parentId,
            title: `Perf task ${number}`,
            status,
            priority: pick(PRIORITIES, number * 7),
            assigneeId: number % 3 ? user.id : null,
            creatorId: user.id,
            dueDate:
              number % 4 ? new Date(today + ((number % 30) - 10) * DAY) : null,
            completedAt: status === 'DONE' ? new Date() : null,
            position: number * 1000,
          };
        };
        const parents = await tx.task.createManyAndReturn({
          data: Array.from({ length: TASKS }, (_, i) => task(i + 1)),
          select: { id: true },
        });
        const subtasks = await tx.task.createManyAndReturn({
          data: Array.from({ length: SUBTASKS }, (_, i) =>
            task(TASKS + i + 1, parents[i * 5].id),
          ),
          select: { id: true },
        });
        if (labels.length) {
          await tx.taskLabel.createMany({
            data: [...parents, ...subtasks]
              .filter((_, i) => i % 2)
              .map((t, i) => ({ taskId: t.id, labelId: pick(labels, i).id })),
          });
        }
      },
      { timeout: 60_000 },
    );
    console.log(
      `Created project PERF with ${TASKS} tasks and ${SUBTASKS} subtasks`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
