import { defineConfig, env } from 'prisma/config';

for (const file of ['.env', '../.env']) {
  try {
    process.loadEnvFile(file);
  } catch {
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npm run seed',
  },
  datasource: { url: env('DATABASE_URL') },
});
