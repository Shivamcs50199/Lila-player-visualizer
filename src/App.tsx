import TopToolbar from './components/layout/TopToolbar'
import { useState } from 'react'
import LeftSidebar from './components/layout/LeftSidebar'
import RightInspector from './components/layout/RightInspector'
import BottomTimeline from './components/layout/BottomTimeline'
import MapCanvas from './components/layout/MapCanvas'

export default function App() {
  const [selectedMap, setSelectedMap] = useState('AmbroseValley')
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
  } catch (err) {
    console.error('[FAILED]', err)
  }
}}
/>

      <div className="flex flex-1 overflow-hidden">

      <LeftSidebar />

        {/* Map Center */}
        <MapCanvas selectedMap={selectedMap} />

        {/* Right Inspector */}
        <RightInspector />

      </div>

      {/* Bottom Timeline */}
      <BottomTimeline />

    </div>
  )
}