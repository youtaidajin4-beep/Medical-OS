import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const databaseDir = path.resolve(scriptDir, '../../../.local/postgres');
const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'medical_os',
  password: 'medical_os',
  port: 5432,
  persistent: true,
  onLog: () => {},
  onError: (error) => console.error(error),
});

if (!existsSync(path.join(databaseDir, 'PG_VERSION'))) {
  console.log('Initializing local PostgreSQL...');
  await pg.initialise();
}

await pg.start();

const client = pg.getPgClient();
await client.connect();
const existing = await client.query(
  "SELECT 1 FROM pg_database WHERE datname = 'medical_os'",
);
await client.end();

if (existing.rowCount === 0) {
  await pg.createDatabase('medical_os');
}

console.log('LOCAL_POSTGRES_READY');

const shutdown = async () => {
  await pg.stop().catch(() => {});
  process.exit(0);
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

await new Promise(() => {});
