import { execSync } from 'node:child_process';
import { prepareTestDb } from './test-db';

async function main() {
  await prepareTestDb();
  Object.assign(process.env, {
    SEED_EMAIL: 'e2e@filemana.test',
    SEED_NAME: 'E2E',
    SEED_PASSWORD: 'e2e-password-123',
    THROTTLE_LIMIT: '1000',
  });
  execSync('node dist/seed.js', { env: process.env, stdio: 'inherit' });
  await import('./main.js');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
