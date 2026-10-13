import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from 'pg';

const TEST_DB = 'filemana_test';

// Points DATABASE_URL at a separate database, creates it if needed and rebuilds it from the
// migrations, so tests never touch dev data. Used by the Jest e2e setup and the Playwright server.
export async function prepareTestDb() {
  for (const file of ['../.env', '../../.env']) {
    try {
      process.loadEnvFile(resolve(__dirname, file));
    } catch {
      // no such file
    }
  }
  const devUrl = process.env.DATABASE_URL;
  if (!devUrl) throw new Error('DATABASE_URL is not set');

  // This wipes a schema and runs migrations: only ever against a local database.
  const { hostname } = new URL(devUrl);
  if (!['localhost', '127.0.0.1', '::1', '[::1]', 'db'].includes(hostname)) {
    throw new Error(
      `Refusing to prepare the test database on host "${hostname}"`,
    );
  }

  // Uploads from tests go to a temp folder, not the dev one.
  process.env.UPLOAD_DIR = join(tmpdir(), 'filemana-test-uploads');

  const testUrl = new URL(devUrl);
  testUrl.pathname = `/${TEST_DB}`;

  const admin = new Client({ connectionString: devUrl });
  await admin.connect();
  try {
    const { rowCount } = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [TEST_DB],
    );
    if (!rowCount) await admin.query(`CREATE DATABASE ${TEST_DB}`);
  } finally {
    await admin.end();
  }

  // Wipe only the test database (the URL above always ends in TEST_DB).
  const test = new Client({ connectionString: testUrl.toString() });
  await test.connect();
  try {
    await test.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  } finally {
    await test.end();
  }

  process.env.DATABASE_URL = testUrl.toString();
  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: process.env,
    stdio: 'pipe',
  });
}
