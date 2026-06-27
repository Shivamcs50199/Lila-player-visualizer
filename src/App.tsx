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