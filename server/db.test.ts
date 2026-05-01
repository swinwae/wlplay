import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { openDb, runMigrations } from './db'

const tmp = path.join(os.tmpdir(), `wlplay-blog-test-${process.pid}-${Date.now()}.db`)

describe('db', () => {
  beforeEach(() => { try { fs.unlinkSync(tmp) } catch {} })

  it('opens a fresh sqlite file', () => {
    const db = openDb(tmp)
    expect(db.open).toBe(true)
    db.close()
  })

  it('runs migrations and is idempotent', () => {
    const db = openDb(tmp)
    runMigrations(db, path.join(__dirname, 'migrations'))
    runMigrations(db, path.join(__dirname, 'migrations'))
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as {name:string}[]
    const names = tables.map(t => t.name)
    expect(names).toContain('posts')
    expect(names).toContain('tags')
    expect(names).toContain('post_tags')
    expect(names).toContain('media_items')
    expect(names).toContain('about')
    expect(names).toContain('_migrations')
    db.close()
  })
})
