// server/db.ts
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

export type DB = Database.Database

export function openDb(filePath: string): DB {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  const db = new Database(filePath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

export function runMigrations(db: DB, migrationsDir: string): void {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`)
  const applied = new Set(
    (db.prepare('SELECT name FROM _migrations').all() as {name:string}[]).map(r => r.name)
  )
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
  for (const file of files) {
    if (applied.has(file)) continue
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    const tx = db.transaction(() => {
      db.exec(sql)
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file)
    })
    tx()
  }
}

let _singleton: DB | null = null
export function getDb(): DB {
  if (_singleton) return _singleton
  const filePath = process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'blog.db')
  _singleton = openDb(filePath)
  runMigrations(_singleton, path.resolve(__dirname, 'migrations'))
  return _singleton
}
