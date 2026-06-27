export default function TopToolbar() {
    return (
      <div className="h-18 border-b border-white/10 flex items-center px-8 gap-10 flex-shrink-0 bg-[#0f1117]">
  
        {/* Logo */}
        <div className="flex items-center gap-8 ml-3">
        <img src="/lila-logo.png.jpg" alt="LILA" className="w-12 h-12 rounded-lg" />
          <div className="leading-none">
            <div className="text-white text-sm font-black tracking-[0.2em]">LILA</div>
            <div className="text-white/50 text-[10px] tracking-[0.2em] mt-0.5">GAMES</div>
          </div>
        </div>
  
        {/* Divider */}
        <div className="w-px h-7 bg-white/10" />
  
        {/* Title */}
        <div className="text-white/70 text-[13px] font-medium tracking-[0.15em] uppercase">
          Player Journey Visualization Tool
        </div>
  
        <div className="flex-1" />
  
        {/* Dropdowns */}
        <div className="flex items-center gap-10">
          {[
            { label: 'MAP', value: 'Desert Valley' },
            { label: 'MATCH', value: '#73281' },
            { label: 'DATE', value: 'May 20, 2024' },
            { label: 'MODE', value: 'All Modes' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-1 cursor-pointer group">
              <span className="text-[11px] text-white/45 tracking-[0.12em] font-semibold uppercase">{item.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-white/90 text-[15px] font-medium group-hover:text-white transition-colors">{item.value}</span>
                <span className="text-white/35 text-[11px]">▾</span>
              </div>
            </div>
          ))}
        </div>
  
        {/* Divider */}
        <div className="w-px h-7 bg-white/10" />
  
        {/* Load Match */}
        <button className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-[13px] font-bold px-7 py-2.5 rounded-lg transition-all tracking-[0.1em] shadow-lg shadow-purple-900/50">
          LOAD MATCH
        </button>
  
      </div>
    )
  }