import type { MatchData } from '../../types/match'
import type { LayerVisibility } from '../../App'

interface LeftSidebarProps {
  matchData:   MatchData | null
  layers:      LayerVisibility
  toggleLayer: (id: keyof LayerVisibility) => void
}

type LayerItem = {
  id:       keyof LayerVisibility
  label:    string
  count:    number | null
  color:    string
  disabled: boolean
}

type LayerGroup = {
  title: string
  items: LayerItem[]
}

export default function LeftSidebar({ matchData, layers, toggleLayer }: LeftSidebarProps) {
  const rows = matchData?.rows ?? []

  const counts = {
    humans:  rows.filter(r => r.event === 'Position').length,
    bots:    rows.filter(r => r.event === 'BotPosition').length,
    kills:   rows.filter(r => r.event === 'Kill' || r.event === 'BotKill').length,
    deaths:  rows.filter(r => r.event === 'Killed' || r.event === 'BotKilled').length,
    loot:    rows.filter(r => r.event === 'Loot').length,
    storm:   rows.filter(r => r.event === 'KilledByStorm').length,
  }

  const layerGroups: LayerGroup[] = [
    {
      title: 'MOVEMENT',
      items: [
        { id: 'humans',   label: 'Humans',       count: counts.humans,  color: '#60a5fa', disabled: false },
        { id: 'bots',     label: 'Bots',         count: counts.bots,    color: '#fb923c', disabled: false },
      ],
    },
    {
      title: 'EVENTS',
      items: [
        { id: 'kills',    label: 'Kills',        count: counts.kills,   color: '#f87171', disabled: false },
        { id: 'deaths',   label: 'Deaths',       count: counts.deaths,  color: '#c084fc', disabled: false },
        { id: 'loot',     label: 'Loot',         count: counts.loot,    color: '#facc15', disabled: false },
        { id: 'storm',    label: 'Storm Deaths', count: counts.storm,   color: '#34d399', disabled: false },
      ],
    },
    {
      title: 'OVERLAYS',
      items: [
        { id: 'heatmap',  label: 'Heatmap',      count: null,           color: '#f97316', disabled: false },
        { id: 'safezone', label: 'Safe Zone',    count: null,           color: '#38bdf8', disabled: true  },
      ],
    },
  ]

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

            <div className="text-[11px] text-white/50 tracking-[0.18em] font-semibold mb-2 px-2">
              {group.title}
            </div>

            <div>
              {group.items.map((item) => {
                const checked = layers[item.id]
                return (
                  <div
                    key={item.id}
                    onClick={() => !item.disabled && toggleLayer(item.id)}
                    className={`flex items-center gap-3 px-2 py-3 rounded-lg transition-colors ${
                      item.disabled
                        ? 'opacity-30 cursor-not-allowed'
                        : 'hover:bg-white/5 cursor-pointer'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className="flex-shrink-0 rounded-md flex items-center justify-center transition-all"
                      style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: checked ? item.color : 'transparent',
                        border: `2px solid ${checked ? item.color : 'rgba(255,255,255,0.20)'}`,
                      }}
                    >
                      {checked && (
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

                    {/* Count */}
                    {item.count !== null && (
                      <div className="text-white/40 text-[13px] font-medium tabular-nums">
                        {item.count}
                      </div>
                    )}
                  </div>
                )
              })}
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