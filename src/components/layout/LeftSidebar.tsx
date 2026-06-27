const layerGroups = [
    {
      title: 'MOVEMENT',
      items: [
        { id: 'humans', label: 'Humans', count: 96, color: '#60a5fa', checked: true },
        { id: 'bots', label: 'Bots', count: 64, color: '#fb923c', checked: true },
      ],
    },
    {
      title: 'EVENTS',
      items: [
        { id: 'kills', label: 'Kills', count: 156, color: '#f87171', checked: true },
        { id: 'deaths', label: 'Deaths', count: 203, color: '#c084fc', checked: true },
        { id: 'loot', label: 'Loot', count: 512, color: '#facc15', checked: true },
        { id: 'storm', label: 'Storm Deaths', count: 87, color: '#34d399', checked: true },
      ],
    },
    {
      title: 'OVERLAYS',
      items: [
        { id: 'heatmap', label: 'Heatmap', count: null, color: '#f97316', checked: false },
        { id: 'safezone', label: 'Safe Zone', count: null, color: '#38bdf8', checked: false },
        { id: 'paths', label: 'Movement Paths', count: null, color: '#a78bfa', checked: false },
      ],
    },
  ]
  
  export default function LeftSidebar() {
    return (
      <div className="w-64 border-r border-white/10 flex-shrink-0 flex flex-col bg-[#0f1117]">
  
        {/* Tabs */}
        <div className="flex border-b border-white/10 px-5 pt-5">
          <button className="text-white text-[13px] font-bold tracking-widest pb-3 border-b-2 border-purple-500 mr-7">
            LAYERS
          </button>
          <button className="text-white/40 text-[13px] font-bold tracking-widest pb-3 border-b-2 border-transparent hover:text-white/70 transition-colors">
            FILTERS
          </button>
        </div>
  
        {/* Groups */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-7">
          {layerGroups.map((group) => (
            <div key={group.title}>
  
              {/* Section heading */}
              <div className="text-[11px] text-white/50 tracking-[0.18em] font-semibold mb-2 px-2">
                {group.title}
              </div>
  
              <div>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    {/* Checkbox */}
                    <div
                      className="flex-shrink-0 rounded-md flex items-center justify-center transition-all"
                      style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: item.checked ? item.color : 'transparent',
                        border: `2px solid ${item.checked ? item.color : 'rgba(255,255,255,0.20)'}`,
                      }}
                    >
                      {item.checked && (
                        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                          <path
                            d="M1 4L4 7.5L10 1"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
  
                    {/* Label */}
                    <div className="flex-1 text-white/90 text-[14px] font-medium">
                      {item.label}
                    </div>
  
                    {/* Count right-aligned */}
                    {item.count !== null && (
                      <div className="text-white/40 text-[13px] font-medium tabular-nums">
                        {item.count}
                      </div>
                    )}
                  </div>
                ))}
              </div>
  
            </div>
          ))}
        </div>
  
        {/* Reset */}
        <div className="px-5 py-5 border-t border-white/10">
          <button className="flex items-center gap-2 text-white/40 hover:text-white/70 text-[12px] font-medium tracking-widest transition-colors">
            <span className="text-[15px]">↺</span>
            <span>RESET LAYERS</span>
          </button>
        </div>
  
      </div>
    )
  }