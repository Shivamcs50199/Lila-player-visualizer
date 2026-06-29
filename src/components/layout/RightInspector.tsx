import type { MatchEvent } from '../../types/match'

interface RightInspectorProps {
  selectedEvent: MatchEvent | null
}

export default function RightInspector({ selectedEvent }: RightInspectorProps) {
    return (
      <div className="w-64 border-l border-white/10 flex-shrink-0 flex flex-col bg-[#0f1117]">
  
        {/* Header */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="text-[13px] font-bold tracking-widest text-white">
            INSPECTOR
          </div>
        </div>
  
        {/* Empty state */}
        <div className="flex-1 flex flex-col px-5 py-5 gap-4">
  {selectedEvent ? (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-[11px] text-white/40 tracking-widest font-semibold uppercase">Event</div>
          <div className="text-white/90 text-[14px] font-medium">{selectedEvent.event}</div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-[11px] text-white/40 tracking-widest font-semibold uppercase">Timestamp</div>
          <div className="text-white/90 text-[14px] font-medium tabular-nums">{selectedEvent.ts}</div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-[11px] text-white/40 tracking-widest font-semibold uppercase">Player ID</div>
          <div className="text-white/90 text-[13px] font-medium break-all">{selectedEvent.user_id}</div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-[11px] text-white/40 tracking-widest font-semibold uppercase">Position</div>
          <div className="text-white/90 text-[13px] font-medium tabular-nums">
            X: {selectedEvent.x.toFixed(2)}<br />
            Z: {selectedEvent.z.toFixed(2)}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-[11px] text-white/40 tracking-widest font-semibold uppercase">Match</div>
          <div className="text-white/90 text-[11px] break-all text-white/50">{selectedEvent.match_id}</div>
        </div>
      </div>
    </>
  ) : (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="8" width="14" height="14" rx="2" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        <rect x="26" y="8" width="14" height="14" rx="2" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        <rect x="8" y="26" width="14" height="14" rx="2" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        <rect x="26" y="26" width="14" height="14" rx="2" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        <path d="M38 38L44 44" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div className="text-center">
        <div className="text-white/70 text-[14px] font-medium leading-snug">
          Select a player or event on the map
        </div>
        <div className="text-white/30 text-[12px] mt-1.5">
          to inspect details
        </div>
      </div>
    </div>
  )}
</div>
    </div>
  )
}