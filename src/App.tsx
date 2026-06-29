import TopToolbar from './components/layout/TopToolbar'
import { useState } from 'react'
import LeftSidebar from './components/layout/LeftSidebar'
import RightInspector from './components/layout/RightInspector'
import BottomTimeline from './components/layout/BottomTimeline'
import MapCanvas from './components/layout/MapCanvas'
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
  const [selectedMap, setSelectedMap]     = useState('AmbroseValley')
  const [matchData, setMatchData]         = useState<MatchData | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<MatchEvent | null>(null)
  const [currentTime, setCurrentTime]     = useState<number | undefined>(undefined)
  const [layers, setLayers]               = useState<LayerVisibility>({
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

  async function handleLoadMatch(files: FileList) {
    try {
      const { parseMatchFile } = await import('./lib/parseMatchFile')

      // Parse in batches instead of all at once. parseMatchFile.ts now
      // reuses one shared DuckDB engine instead of spinning up a new one
      // per file — but even with one engine, firing off hundreds of
      // concurrent queries in a single Promise.all still overloads memory.
      // Batching keeps the number of files being parsed at once bounded.
      const BATCH_SIZE = 40
      const fileArray = Array.from(files)
      const allResults: MatchData[] = []

      for (let i = 0; i < fileArray.length; i += BATCH_SIZE) {
        const batch = fileArray.slice(i, i + BATCH_SIZE)
        const batchResults = await Promise.all(batch.map(f => parseMatchFile(f)))
        allResults.push(...batchResults)
        console.log(`[LOAD MATCH] parsed ${Math.min(i + BATCH_SIZE, fileArray.length)} / ${fileArray.length} files`)
      }

      const matchGroups: Record<string, typeof allResults[0]['rows']> = {}
      for (const result of allResults) {
        if (!matchGroups[result.matchId]) matchGroups[result.matchId] = []
        matchGroups[result.matchId].push(...result.rows)
      }

      const sortedGroups = Object.entries(matchGroups).sort((a, b) => b[1].length - a[1].length)
      const bestMatchId = sortedGroups[0][0]
      const combinedRows = matchGroups[bestMatchId].sort((a, b) => a.ts - b.ts)
      const mapId = combinedRows[0]?.map_id ?? 'AmbroseValley'
      const combined = {
        rows:     combinedRows,
        mapId,
        matchId:  bestMatchId,
        duration: Math.max(...combinedRows.map(r => r.ts)),
      }
      setMatchData(combined)
      setSelectedMap(mapId)
      setCurrentTime(Math.min(...combinedRows.map(r => r.ts)))
      setSelectedEvent(null)
      console.log(
        '[LOAD MATCH]', files.length, 'files →', combinedRows.length, 'rows,',
        'matchId:', bestMatchId,
        '(', sortedGroups.length, 'distinct match_id(s) found across selected files)'
      )
    } catch (err) {
      console.error('[LOAD MATCH FAILED]', err)
    }
  }

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
    </div>
  )
}