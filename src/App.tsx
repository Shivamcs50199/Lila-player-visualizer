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

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f1117] text-white overflow-hidden min-w-[1024px]">
      <TopToolbar />
      <input
        type="file"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          try {
            const { parseMatchFile } = await import('./lib/parseMatchFile')
            const data = await parseMatchFile(file)
            setMatchData(data)
            setSelectedMap(data.mapId)
            const minTs = Math.min(...data.rows.map(r => r.ts))
            setCurrentTime(minTs)
            // TEMP: auto-select first kill to verify Inspector works
            const firstKill = data.rows.find(r => r.event === 'Kill' || r.event === 'BotKill')
            if (firstKill) setSelectedEvent(firstKill)
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