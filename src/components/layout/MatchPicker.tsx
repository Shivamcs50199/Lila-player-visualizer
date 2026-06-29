import type { MatchEvent } from '../../types/match'

export type MatchGroup = {
  matchId:     string
  mapId:       string
  playerCount: number
  duration:    number
  rows:        MatchEvent[]
}

type Props = {
  groups:   MatchGroup[]
  onSelect: (rows: MatchEvent[]) => void
  onCancel: () => void
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

export default function MatchPicker({ groups, onSelect, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="relative w-[520px] max-h-[80vh] flex flex-col rounded-xl border border-white/10 bg-[#16191f] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold text-white">Select a Match</h2>
            <p className="text-xs text-white/40 mt-0.5">
              {groups.length} matches found in this folder
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-white/40 hover:text-white transition-colors text-xl leading-none"
            aria-label="Close"
            >
              &times;
            </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {groups.map((g, i) => (
            <button
              key={g.matchId}
              onClick={() => onSelect(g.rows)}
              className="w-full text-left rounded-lg border border-white/8 bg-white/4 hover:bg-purple-600/20 hover:border-purple-500/50 transition-all px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-white/30 font-mono uppercase tracking-wider">
                    Match {i + 1}
                  </span>
                  <div className="text-sm font-mono text-white mt-0.5">
                    #{g.matchId.slice(0, 8)}
                  </div>
                  <div className="text-xs text-white/50 mt-1">{g.mapId}</div>
                </div>
                <div className="text-right space-y-1">
                <div className="flex items-center gap-1.5 justify-end text-xs text-white/50">
                    <span>{g.playerCount} players</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end text-xs text-white/50">
                    <span>{fmtDuration(g.duration)}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-white/10">
          <button
            onClick={onCancel}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}