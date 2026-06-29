import * as duckdb from '@duckdb/duckdb-wasm'
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import type { MatchEvent, MatchData } from '../types/match'

// ─── Shared DuckDB engine ───────────────────────────────────────────────────
// Previously, every call to parseMatchFile() created a brand-new Worker +
// WASM instance from scratch. Fine for one file — but loading hundreds of
// files for LOAD MATCH meant hundreds of Workers + WASM modules all starting
// up at once. That's what froze the browser, not just the data volume.
//
// Now the engine is created once, lazily, on the first call. Every later
// call — even for a completely different file — reuses that same instance.
let dbInstance: duckdb.AsyncDuckDB | null = null
let dbInitPromise: Promise<duckdb.AsyncDuckDB> | null = null

async function getDB(): Promise<duckdb.AsyncDuckDB> {
  if (dbInstance) return dbInstance
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      const worker = new Worker(mvp_worker)
      const logger = new duckdb.ConsoleLogger()
      const db = new duckdb.AsyncDuckDB(logger, worker)
      await db.instantiate(duckdb_wasm)
      dbInstance = db
      return db
    })()
  }
  return dbInitPromise
}

// Each file gets registered under its own unique name. With one shared
// engine, several files can be mid-parse at the same time (within a LOAD
// MATCH batch) — without unique names they'd all collide trying to use the
// same "match.parquet" handle at once.
let fileCounter = 0

export async function parseMatchFile(file: File): Promise<MatchData> {
  const db = await getDB()
  const registeredName = `match_${fileCounter++}.parquet`

  const conn = await db.connect()

  await db.registerFileHandle(registeredName, file, duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true)

  const result = await conn.query(`SELECT * FROM parquet_scan("${registeredName}")`)

  const rows: MatchEvent[] = result.toArray().map((row: any) => {
    const rawEvent = row['event']
    let eventStr = ''
    if (rawEvent instanceof Uint8Array) {
      eventStr = new TextDecoder('utf-8').decode(rawEvent)
    } else if (typeof rawEvent === 'string') {
      eventStr = rawEvent
    }

    return {
      user_id: String(row['user_id'] ?? ''),
      match_id: String(row['match_id'] ?? ''),
      map_id: String(row['map_id'] ?? ''),
      x: Number(row['x'] ?? 0),
      y: Number(row['y'] ?? 0),
      z: Number(row['z'] ?? 0),
      ts: Number(row['ts'] ?? 0),
      event: eventStr,
    }
  })

  await conn.close()

  // Free the file from DuckDB's registry now that we're done reading it.
  // Matters a lot when loading hundreds of files in one LOAD MATCH session.
  try {
    await db.dropFile(registeredName)
  } catch {
    // best-effort cleanup only — not worth failing the whole parse over
  }

  const mapId = rows[0]?.map_id ?? 'AmbroseValley'
  const matchId = rows[0]?.match_id ?? ''
  const duration = Math.max(...rows.map(r => r.ts))

  return { rows, mapId, matchId, duration }
}