import { defineConfig, env } from 'prisma/config';

// Prisma CLI does not read .env itself; in Docker the variables come from the environment.
// backend/.env wins over the root .env, which wins over nothing (already-set variables are kept).
for (const file of ['.env', '../.env']) {
  try {
    process.loadEnvFile(file);
  } catch {
    // no such file
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  // The generated client uses .js import specifiers, so the seed runs from the compiled build.
  migrations: {
    path: 'prisma/migrations',
    seed: 'npm run seed',
  },
  datasource: { url: env('DATABASE_URL') },
});
