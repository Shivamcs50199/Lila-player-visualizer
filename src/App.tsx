// src/App.tsx
import TopToolbar from './components/layout/TopToolbar'
import { useState } from 'react'
import LeftSidebar from './components/layout/LeftSidebar'
import RightInspector from './components/layout/RightInspector'
import BottomTimeline from './components/layout/BottomTimeline'
import MapCanvas from './components/layout/MapCanvas'
import MatchPicker from './components/layout/MatchPicker'
import type { MatchGroup } from './components/layout/MatchPicker'
import type { MatchData, MatchEvent } from './types/match'

export type LayerVisibility = {
  humans:    boolean
  bots:      boolean
  kills:     boolean
  deaths:    boolean
  loot:      boolean
  storm:     boolean
  heatmap:   boolean
  safezone:  boolean
}

export default function App() {
  const [selectedMap, setSelectedMap]       = useState('AmbroseValley')
  const [matchData, setMatchData]           = useState<MatchData | null>(null)
  const [selectedEvent, setSelectedEvent]   = useState<MatchEvent | null>(null)
  const [currentTime, setCurrentTime]       = useState<number | undefined>(undefined)
  const [pendingGroups, setPendingGroups]   = useState<MatchGroup[] | null>(null)

  // ─── Loading overlay state ──────────────────────────────────────────────────
  // Drives the fullscreen "Loading Match Data" overlay shown while LOAD MATCH
  // is parsing files. Does not affect parsing, batching, or grouping logic —
  // these three values are only ever read by the overlay's own JSX below.
  const [isLoading, setIsLoading]             = useState(false)
  const [loadingMessage, setLoadingMessage]   = useState('')
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number } | null>(null)

  const [layers, setLayers]                 = useState<LayerVisibility>({
    humans:   true,
    bots:     true,
    kills:    true,
    deaths:   true,
    loot:     true,
    storm:    true,
    heatmap:  false,
    safezone: false,
  })

  function toggleLayer(id: keyof LayerVisibility) {
    setLayers(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function handleTimeChange(t: number | ((prev: number | undefined) => number)) {
    setCurrentTime(prev => typeof t === 'function' ? t(prev) : t)
  }

  // ─── Core loader ────────────────────────────────────────────────────────────
  function loadMatch(rows: MatchEvent[]) {
    const sorted = rows.slice().sort((a, b) => a.ts - b.ts)
    const mapId  = sorted[0]?.map_id ?? 'AmbroseValley'
    const matchId = sorted[0]?.match_id ?? ''
    const duration = Math.max(...sorted.map(r => r.ts))

    setMatchData({ rows: sorted, mapId, matchId, duration })
    setSelectedMap(mapId)
    setCurrentTime(Math.min(...sorted.map(r => r.ts)))
    setSelectedEvent(null)
    setPendingGroups(null)

    // First impression on load: hide the dense movement web by default.
    // Humans/Bots can still be switched on anytime from the sidebar —
    // this only changes the starting state right after a match loads.
    setLayers(prev => ({ ...prev, humans: false, bots: false }))
  }

  // ─── File / folder handler ──────────────────────────────────────────────────
  async function handleLoadMatch(files: FileList) {
    try {
      setIsLoading(true)
      setLoadingMessage('Parsing player files...')
      setLoadingProgress(null)

      // ── STAGE 3: did handleLoadMatch receive the files? ──────────────────
      console.log('[STAGE 3] handleLoadMatch called — total files received:', files.length)

      const { parseMatchFile } = await import('./lib/parseMatchFile')

      const BATCH_SIZE = 40
      console.log('[STAGE 4 DEBUG] first 5 filenames:', Array.from(files).slice(0, 5).map(f => f.name))
      Array.from(files).slice(0, 5).forEach(f => console.log('[FILE DEBUG]', f.name, '|', f.webkitRelativePath, '|', f.type))
      const fileArray  = Array.from(files).filter(f => f.name.endsWith('.nakama-0'))

      // ── STAGE 4: how many .parquet files remain after filtering? ─────────
      console.log('[STAGE 4] .parquet files after filter:', fileArray.length)
      if (fileArray.length > 0) {
        console.log('[STAGE 4] first file name sample:', fileArray[0].name)
        console.log('[STAGE 4] last  file name sample:', fileArray[fileArray.length - 1].name)
      }

      if (fileArray.length === 0) {
        console.warn('[STAGE 4] No .parquet files found — aborting')
        setIsLoading(false)
        return
      }

      setLoadingProgress({ current: 0, total: fileArray.length })

      const allResults: Awaited<ReturnType<typeof parseMatchFile>>[] = []

      for (let i = 0; i < fileArray.length; i += BATCH_SIZE) {
        const batch = fileArray.slice(i, i + BATCH_SIZE)

        // ── STAGE 5: did batch parsing begin? ───────────────────────────────
        console.log(
          `[STAGE 5] Starting batch ${Math.floor(i / BATCH_SIZE) + 1} — files ${i + 1}–${Math.min(i + BATCH_SIZE, fileArray.length)} of ${fileArray.length}`
        )

        const batchResults = await Promise.all(batch.map(f => parseMatchFile(f)))
        allResults.push(...batchResults)

        // ── STAGE 6: did this batch complete? ───────────────────────────────
        const parsedSoFar = Math.min(i + BATCH_SIZE, fileArray.length)
        console.log(
          `[STAGE 6] Batch complete — parsed ${parsedSoFar} / ${fileArray.length} files so far`
        )
        setLoadingProgress({ current: parsedSoFar, total: fileArray.length })
      }

      console.log('[STAGE 6] All batches done — total result objects:', allResults.length)
      setLoadingMessage('Grouping players into matches...')

      // ── Group by match_id ──────────────────────────────────────────────────
      const rowsByMatch: Record<string, MatchEvent[]> = {}
      for (const result of allResults) {
        if (!rowsByMatch[result.matchId]) rowsByMatch[result.matchId] = []
        rowsByMatch[result.matchId].push(...result.rows)
      }

      // ── STAGE 7: how many distinct match_ids were found? ─────────────────
      const matchIds = Object.keys(rowsByMatch)
      console.log('[STAGE 7] distinct match_ids found:', matchIds.length)
      matchIds.forEach((id, i) =>
        console.log(`[STAGE 7]   [${i}] matchId=${id} rows=${rowsByMatch[id].length}`)
      )

      const groups: MatchGroup[] = Object.entries(rowsByMatch).map(([matchId, rows]) => {
        const mapId      = rows[0]?.map_id ?? 'AmbroseValley'
        const duration   = Math.max(...rows.map(r => r.ts))
        const playerIds  = new Set(rows.map(r => r.user_id))
        return { matchId, mapId, playerCount: playerIds.size, duration, rows }
      })

      groups.sort((a, b) => b.playerCount - a.playerCount)

      if (groups.length === 1) {
        console.log('[STAGE 8] Single match — calling loadMatch directly (no picker)')
        loadMatch(groups[0].rows)
        setIsLoading(false)
      } else {
        // ── STAGE 8: is pendingGroups about to be set? ───────────────────
        console.log('[STAGE 8] Multiple matches — calling setPendingGroups with', groups.length, 'groups')
        setLoadingMessage('Preparing Match Picker...')
        setLoadingProgress(null) // clear the file counter — overlay now just shows the message, no "x / y files"
        setPendingGroups(groups)
        // React 18 batches these state updates (all set synchronously in
        // this block) into a single re-render — so the Match Picker mounts
        // in the exact same paint as the overlay disappearing. That's what
        // gives the "prepare → render → hide" feel with no visible flash,
        // without needing any artificial delay.
        setIsLoading(false)
        // STAGE 9 (MatchPicker render) is confirmed by the MatchPicker
        // component itself mounting — check React DevTools or add a
        // console.log inside MatchPicker if needed.
      }
    } catch (err) {
      console.error('[LOAD MATCH FAILED]', err)
      setIsLoading(false)
    }
  }
  console.log('[RENDER] pendingGroups:', pendingGroups?.length ?? 'null')

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f1117] text-white overflow-hidden min-w-[1024px]">
      <TopToolbar
        onLoadMatch={handleLoadMatch}
        matchInfo={matchData ? {
          map:   matchData.mapId,
          match: '#' + matchData.matchId.slice(0, 5),
          date:  new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        } : undefined}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          matchData={matchData}
          layers={layers}
          toggleLayer={toggleLayer}
        />

        <MapCanvas
          selectedMap={selectedMap}
          matchData={matchData}
          layers={layers}
          currentTime={currentTime}
          onEventSelect={setSelectedEvent}
        />

        <RightInspector selectedEvent={selectedEvent} />
      </div>

      <BottomTimeline
        matchData={matchData}
        currentTime={currentTime}
        onTimeChange={handleTimeChange}
      />

      {pendingGroups && (
        <MatchPicker
          groups={pendingGroups}
          onSelect={loadMatch}
          onCancel={() => setPendingGroups(null)}
        />
      )}

      {/* ─── Loading overlay ─────────────────────────────────────────────────
          Fullscreen, dark blurred backdrop, centered card. Purely additive —
          covers everything else only while isLoading is true, and never
          touches parsing/batching/grouping state. */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#161922] border border-white/10 rounded-2xl px-10 py-8 w-[360px] flex flex-col items-center gap-5 shadow-2xl shadow-black/50">
            <div className="w-10 h-10 border-[3px] border-white/15 border-t-purple-500 rounded-full animate-spin" />
            <div className="text-center">
              <div className="text-white text-[15px] font-bold tracking-wide mb-1">Loading Match Data</div>
              <div className="text-white/60 text-[13px]">{loadingMessage}</div>
              {loadingProgress && (
                <div className="text-white/40 text-[12px] mt-1">
                  {loadingProgress.current} / {loadingProgress.total} files processed
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}