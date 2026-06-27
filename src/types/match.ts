// One row from a .nakama-0 parquet file, typed per README schema
export interface MatchEvent {
    user_id:  string        // UUID = human, numeric string = bot
    match_id: string        // includes .nakama-0 suffix
    map_id:   string        // 'AmbroseValley' | 'GrandRift' | 'Lockdown'
    x:        number        // world X coordinate
    y:        number        // elevation — not used for 2D mapping
    z:        number        // world Z coordinate
    ts:       number        // milliseconds elapsed in match
    event:    string        // decoded from bytes per README
  }
  
  // Derived sets built from raw rows — used by filters and layers
  export interface MatchData {
    rows:     MatchEvent[]
    mapId:    string
    matchId:  string
    duration: number        // max ts value = match length in ms
  }