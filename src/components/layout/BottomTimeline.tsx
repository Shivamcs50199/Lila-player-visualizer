import { useEffect, useRef, useState } from 'react'
import type { MatchData } from '../../types/match'

interface BottomTimelineProps {
  matchData: MatchData | null
  currentTime: number | undefined
  onTimeChange: (t: number | ((prev: number | undefined) => number)) => void
}
export default function BottomTimeline({ matchData, currentTime: _currentTime, onTimeChange: _onTimeChange }: BottomTimelineProps) {
  const minTs = matchData?.rows.length ? Math.min(...matchData.rows.map(r => r.ts)) : 0
const maxTs = matchData?.rows.length ? Math.max(...matchData.rows.map(r => r.ts)) : 0
const duration = maxTs - minTs
const [isPlaying, setIsPlaying] = useState(false)
const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
const trackAreaRef = useRef<HTMLDivElement>(null)
const isDragging = useRef(false)
const REPLAY_DURATION_MS = 30000 // 30 seconds real time
const TICK_MS = 50
const increment = duration > 0 ? (duration / REPLAY_DURATION_MS) * TICK_MS : 1000
const currentTimeRelative = _currentTime !== undefined ? _currentTime - minTs : 0
const playheadPercent = duration > 0 ? (currentTimeRelative / duration) * 100 : 0

function seekToPosition(clientX: number) {
  if (!trackAreaRef.current || duration === 0) return
  const rect = trackAreaRef.current.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  _onTimeChange(minTs + ratio * duration)
}

useEffect(() => {
  if (isPlaying) {
    intervalRef.current = setInterval(() => {
      console.log('[PLAY] tick, isPlaying:', isPlaying)
      _onTimeChange(prev => {
        const next = (prev ?? minTs) + increment
if (next >= maxTs) { setIsPlaying(false); return maxTs }
return next
  })
}, TICK_MS)
  } else {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }
  return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
}, [isPlaying, minTs, maxTs])

const eventTracks = [
  { id: 'kills', label: 'Kills', color: '#f87171', count: matchData?.rows.filter(r => r.event === 'Kill' || r.event === 'BotKill').length ?? 0, events: matchData?.rows.filter(r => r.event === 'Kill' || r.event === 'BotKill') ?? [] },
  { id: 'deaths', label: 'Deaths', color: '#c084fc', count: matchData?.rows.filter(r => r.event === 'Killed' || r.event === 'BotKilled').length ?? 0, events: matchData?.rows.filter(r => r.event === 'Killed' || r.event === 'BotKilled') ?? [] },
  { id: 'loot', label: 'Loot', color: '#facc15', count: matchData?.rows.filter(r => r.event === 'Loot').length ?? 0, events: matchData?.rows.filter(r => r.event === 'Loot') ?? [] },
  { id: 'storm', label: 'Storm Deaths', color: '#34d399', count: matchData?.rows.filter(r => r.event === 'KilledByStorm').length ?? 0, events: matchData?.rows.filter(r => r.event === 'KilledByStorm') ?? [] },
]
    return (
      <div className="h-64 border-t border-white/10 flex-shrink-0 flex flex-col bg-[#0f1117]">
  
        {/* Playback Controls */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-white/10">
  
          <div className="flex items-center gap-2">
            <button className="text-white/40 hover:text-white/80 transition-colors text-sm font-bold px-1">|&lt;</button>
            <button className="text-white/40 hover:text-white/80 transition-colors text-sm font-bold px-1">&lt;&lt;</button>
            <button onClick={() => setIsPlaying(p => !p)} className="w-8 h-8 rounded-lg bg-purple-600 hover:bg-purple-500 flex items-center justify-center transition-colors">
            {isPlaying ? (
              <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
                <rect x="1" y="1" width="4" height="12" rx="1" />
                <rect x="7" y="1" width="4" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
                <path d="M1 1L11 7L1 13V1Z" />
              </svg>
            )}
          </button>
            <button className="text-white/40 hover:text-white/80 transition-colors text-sm font-bold px-1">&gt;&gt;</button>
            <button className="text-white/40 hover:text-white/80 transition-colors text-sm font-bold px-1">&gt;|</button>
          </div>
  
          <div className="flex items-center gap-1 text-white/50 text-[12px] font-medium">
            <span>1.0x</span>
            <span className="text-white/20">▾</span>
          </div>
  
          <div className="flex-1" />
  
          <div className="text-[13px] font-medium tabular-nums">
            <span className="text-white/80">08:42</span>
            <span className="text-white/30"> / 23:15</span>
          </div>
  
          <div className="flex items-center gap-3">
            <button className="text-white/30 hover:text-white/60 transition-colors text-[12px] font-medium">MARK</button>
            <button className="text-white/30 hover:text-white/60 transition-colors text-[12px] font-medium">CAP</button>
            <button className="text-white/30 hover:text-white/60 transition-colors text-[12px] font-medium">RST</button>
          </div>
  
        </div>
  
        {/* Timeline Tracks */}
        <div className="flex flex-1 overflow-hidden">
  
          {/* Labels */}
          <div className="w-28 flex-shrink-0 flex flex-col border-r border-white/10">
            {eventTracks.map((track) => (
              <div key={track.id} className="flex-1 flex items-center justify-between px-4 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: track.color }} />
                  <span className="text-white/60 text-[11px] font-medium">{track.label}</span>
                </div>
                <span className="text-white/30 text-[11px] tabular-nums">{track.count}</span>
              </div>
            ))}
          </div>
  
          {/* Track area */}
          <div className="flex-1 flex flex-col relative">
  
            {/* Ruler */}
            <div className="flex items-center border-b border-white/10 px-2 h-5 flex-shrink-0">
              {['00:00', '05:00', '10:00', '15:00', '20:00', '23:15'].map((t) => (
                <div key={t} className="flex-1 text-[10px] text-white/20 tabular-nums">{t}</div>
              ))}
            </div>
  
            {/* Rows */}
            {/* Rows */}
            <div
              ref={trackAreaRef}
              className="flex-1 flex flex-col relative cursor-pointer"
              onClick={(e) => seekToPosition(e.clientX)}
              onMouseDown={(e) => { isDragging.current = true; seekToPosition(e.clientX) }}
              onMouseMove={(e) => { if (isDragging.current) seekToPosition(e.clientX) }}
              onMouseUp={() => { isDragging.current = false }}
              onMouseLeave={() => { isDragging.current = false }}
            >
              {eventTracks.map((track) => (
                <div key={track.id} className="flex-1 relative border-b border-white/5 last:border-0">
                 {track.events.map((row, i) => (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 w-1 h-3 rounded-sm opacity-70"
              style={{
                backgroundColor: track.color,
                left: `${duration > 0 ? ((row.ts - minTs) / duration) * 100 : 0}%`,
              }}
            />
            ))}
                </div>
              ))}
  
              {/* Playhead */}
              <div className="absolute top-0 bottom-0 w-px bg-purple-500 opacity-80" style={{ left: `${playheadPercent}%` }}>
                <div className="w-3 h-3 bg-purple-500 rounded-full -translate-x-1/2 absolute -top-1 left-0" />
              </div>
            </div>
  
          </div>
  
        </div>
  
      </div>
    )
  }