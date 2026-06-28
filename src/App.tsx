import TopToolbar from './components/layout/TopToolbar'
import { useState } from 'react'
import LeftSidebar from './components/layout/LeftSidebar'
import RightInspector from './components/layout/RightInspector'
import BottomTimeline from './components/layout/BottomTimeline'
import MapCanvas from './components/layout/MapCanvas'
import type { MatchData } from './types/match'

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
  const [selectedMap, setSelectedMap] = useState('AmbroseValley')
  const [matchData, setMatchData]     = useState<MatchData | null>(null)
  const [layers, setLayers]           = useState<LayerVisibility>({
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

  const [currentTime, setCurrentTime] = useState<number | undefined>(undefined)

  function handleTimeChange(t: number | ((prev: number | undefined) => number)) {
    setCurrentTime(prev => typeof t === 'function' ? t(prev) : t)
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f1117] text-white overflow-hidden min-w-[1024px]">
      <TopToolbar />
      <input
        type="file"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          console.log('[STEP 1] input fired, file:', file?.name, file?.size, 'bytes')
          if (!file) return
          try {
            const { parseMatchFile } = await import('./lib/parseMatchFile')
            console.log('[STEP 2] parseMatchFile() reached, calling it now')
            const data = await parseMatchFile(file)
            console.log('[DONE] rows:', data.rows.length, 'map:', data.mapId, 'match:', data.matchId)
            console.log('First 3 rows:', data.rows.slice(0, 3))
            setMatchData(data)
            setSelectedMap(data.mapId)
            const matchMinTs = Math.min(...data.rows.map(r => r.ts))
            setCurrentTime(matchMinTs)
            const minTs = Math.min(...data.rows.map(r => r.ts))
            setCurrentTime(minTs)
          } catch (err) {
            console.error('[FAILED]', err)
          }
        }}
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
/>

        <RightInspector />
      </div>

      <BottomTimeline
  matchData={matchData}
  currentTime={currentTime}
  onTimeChange={handleTimeChange}
/>
    </div>
  )
}