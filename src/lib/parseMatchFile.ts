import * as duckdb from '@duckdb/duckdb-wasm'
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import type { MatchEvent, MatchData } from '../types/match'

export async function parseMatchFile(file: File): Promise<MatchData> {
  const worker = new Worker(mvp_worker)
  const logger = new duckdb.ConsoleLogger()
  const db = new duckdb.AsyncDuckDB(logger, worker)

  await db.instantiate(duckdb_wasm)
  console.log('[STEP 3] duckdb instantiated')

  const conn = await db.connect()
  console.log('[STEP 3] connected to duckdb')

  await db.registerFileHandle('match.parquet', file, duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true)
  console.log('[STEP 4] file registered with duckdb')

  const result = await conn.query('SELECT * FROM parquet_scan("match.parquet")')
  console.log('[STEP 4] query returned', result.numRows, 'rows')

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

  console.log('Total rows:', rows.length)
  console.log('First 3:', rows.slice(0, 3))

  const mapId = rows[0]?.map_id ?? 'AmbroseValley'
  const matchId = rows[0]?.match_id ?? ''
  const duration = Math.max(...rows.map(r => r.ts))

  return { rows, mapId, matchId, duration }
}