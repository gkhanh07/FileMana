import { execSync } from 'node:child_process';
import { prepareTestDb } from './test-db';

// Started by the frontend's Playwright config: fresh test database, one known account, then the API.
async function main() {
  await prepareTestDb();
  Object.assign(process.env, {
    SEED_EMAIL: 'e2e@filemana.test',
    SEED_NAME: 'E2E',
    SEED_PASSWORD: 'e2e-password-123',
  });
  execSync('node dist/seed.js', { env: process.env, stdio: 'inherit' });
  await import('./main.js');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
