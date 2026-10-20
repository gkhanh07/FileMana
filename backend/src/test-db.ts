import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from 'pg';

const TEST_DB = 'filemana_test';

export function loadEnv() {
  for (const file of ['../.env', '../../.env']) {
    try {
      process.loadEnvFile(resolve(__dirname, file));
    } catch {
      continue;
    }
  }
}

export function assertLocalDb(url: string) {
  // The production compose file also names its database host "db".
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to touch the database in production');
  }
  const { hostname } = new URL(url);
  if (!['localhost', '127.0.0.1', '::1', '[::1]', 'db'].includes(hostname)) {
    throw new Error(`Refusing to touch the database on host "${hostname}"`);
  }
}

export async function prepareTestDb() {
  loadEnv();
  const devUrl = process.env.DATABASE_URL;
  if (!devUrl) throw new Error('DATABASE_URL is not set');
  assertLocalDb(devUrl);

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
