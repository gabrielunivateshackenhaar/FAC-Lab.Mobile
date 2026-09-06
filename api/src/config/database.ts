import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { env } from './env';

let databaseInstance: Database.Database | null = null;

function initializeDatabase(): Database.Database {
  const databaseFilePath = path.resolve(__dirname, '../../', env.DATABASE_PATH);
  const databaseDirectory = path.dirname(databaseFilePath);

  if (!fs.existsSync(databaseDirectory)) {
    fs.mkdirSync(databaseDirectory, { recursive: true });
  }

  const db = new Database(databaseFilePath);

  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('cache_size = -64000');
  db.pragma('temp_store = MEMORY');

  const schemaFilePath = path.resolve(__dirname, '../../database/schema.sql');
  if (fs.existsSync(schemaFilePath)) {
    const schemaSql = fs.readFileSync(schemaFilePath, 'utf-8');
    db.exec(schemaSql);
  }

  return db;
}

export function getDatabase(): Database.Database {
  if (!databaseInstance) {
    databaseInstance = initializeDatabase();
  }
  return databaseInstance;
}

process.on('SIGINT', () => {
  if (databaseInstance) {
    databaseInstance.close();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (databaseInstance) {
    databaseInstance.close();
  }
  process.exit(0);
});
