import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from './generated/prisma/client';

// FR-ROLE-01: creates the workspace and the first account from the environment.
// Safe to re-run: existing rows are left alone. Same command on the VPS (no demo data).
const LABELS = [
  ['Bug', 'red'],
  ['Tính năng', 'blue'],
  ['Thiết kế', 'violet'],
  ['Tài liệu', 'slate'],
] as const;

async function main() {
  const need = (name: string) => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required to seed`);
    return value;
  };
  const email = need('SEED_EMAIL').trim().toLowerCase();
  const name = need('SEED_NAME');
  const password = need('SEED_PASSWORD');
  const workspaceName = process.env.WORKSPACE_NAME || 'FileMana';

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: need('DATABASE_URL') }),
  });
  try {
    if (!(await prisma.workspace.count())) {
      await prisma.workspace.create({ data: { name: workspaceName } });
    }
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name, passwordHash: await argon2.hash(password) },
    });
    // Shared labels (FR-TASK-03); Settings manages them later (FR-SET-12).
    await prisma.label.createMany({
      data: LABELS.map(([name, color]) => ({ name, color })),
      skipDuplicates: true,
    });
    console.log(`Seeded workspace and account ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
