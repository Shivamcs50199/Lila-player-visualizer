export default function RightInspector() {
    return (
      <div className="w-64 border-l border-white/10 flex-shrink-0 flex flex-col bg-[#0f1117]">
  
        {/* Header */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="text-[13px] font-bold tracking-widest text-white">
            INSPECTOR
          </div>
        </div>
  
        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
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
  
      </div>
    )
  }