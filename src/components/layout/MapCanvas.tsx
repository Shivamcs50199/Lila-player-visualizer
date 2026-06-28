import { useEffect, useRef, useState } from 'react'
import type { MatchData } from '../../types/match'
import type { LayerVisibility } from '../../App'

// ─── Map assets ───────────────────────────────────────────────────────────────
const MAP_ASSETS: Record<string, string> = {
  AmbroseValley: '/minimaps/AmbroseValley_Minimap.png',
  GrandRift:     '/minimaps/GrandRift_Minimap.png',
  Lockdown:      '/minimaps/Lockdown_Minimap.png',
}

// ─── Map configs — exact values from README, do not modify ───────────────────
// Scale and origin define the world coordinate space for each map.
// Used in Step 1 of the coordinate conversion pipeline.
const MAP_CONFIGS: Record<string, { scale: number; originX: number; originZ: number }> = {
  AmbroseValley: { scale: 900,  originX: -370, originZ: -473 },
  GrandRift:     { scale: 581,  originX: -290, originZ: -290 },
  Lockdown:      { scale: 1000, originX: -500, originZ: -500 },
}

// ─── Minimap image size — fixed per README ────────────────────────────────────
const MINIMAP_SIZE = 1024

// ─── Types ────────────────────────────────────────────────────────────────────
interface MapCanvasProps {
  selectedMap: string
  matchData:   MatchData | null
  layers:      LayerVisibility
}

// Tracks the exact pixel rect where the map image is drawn on the canvas.
// All event markers must use this rect to stay aligned with the map.
interface MapRect {
  x: number  // left edge of drawn map image in canvas pixels
  y: number  // top edge of drawn map image in canvas pixels
  w: number  // width of drawn map image in canvas pixels
  h: number  // height of drawn map image in canvas pixels
}

export default function MapCanvas({ selectedMap, matchData, layers }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const [mapRect, setMapRect] = useState<MapRect>({ x: 0, y: 0, w: 0, h: 0 })

  const imageSrc = MAP_ASSETS[selectedMap] ?? MAP_ASSETS['AmbroseValley']

  // ─── Draw map image onto canvas, letterboxed ────────────────────────────────
  // Uses object-contain logic (Math.min) so the full map is always visible.
  // Records the exact draw rect into mapRect for use by all event markers.
  useEffect(() => {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const { width: cw, height: ch } = container.getBoundingClientRect()
    canvas.width  = cw
    canvas.height = ch

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.src = imageSrc

    img.onload = () => {
      ctx.clearRect(0, 0, cw, ch)
    
      const imgW  = img.naturalWidth
      const imgH  = img.naturalHeight
      const scale = Math.min(cw / imgW, ch / imgH)
    
      const drawW = imgW * scale
      const drawH = imgH * scale
      const drawX = (cw - drawW) / 2
      const drawY = (ch - drawH) / 2
    
      // Don't draw the image here anymore — the <img> tag handles display
      // Only record mapRect for the coordinate pipeline
      setMapRect({ x: drawX, y: drawY, w: drawW, h: drawH })
    }
  }, [imageSrc, selectedMap])

  // ─── COORDINATE PIPELINE ────────────────────────────────────────────────────
  //
  // All player paths, kills, deaths, loot, storm events must go through
  // BOTH steps in order:
  //
  //   worldToMinimap(x, z, selectedMap)  →  [minimapPx, minimapPy]
  //   minimapToCanvas(minimapPx, minimapPy)  →  [canvasPx, canvasPy]
  //
  // Never skip a step. Never manually offset or scale outside this pipeline.

  /**
   * STEP 1 — World coordinates → 1024×1024 minimap pixel coordinates
   *
   * Exact formula from README:
   *   u       = (x - originX) / scale
   *   v       = (z - originZ) / scale
   *   pixel_x = u * 1024
   *   pixel_y = (1 - v) * 1024   ← Y flipped: image origin is top-left
   *
   * Note: The `y` column in the data is elevation — ignore it for 2D mapping.
   * Only `x` and `z` are used here.
   *
   * Example (AmbroseValley): x=-301.45, z=-355.55
   *   u = (-301.45 - (-370)) / 900 = 0.0762  →  pixel_x = 78
   *   v = (-355.55 - (-473)) / 900 = 0.1305  →  pixel_y = 890
   */
  function worldToMinimap(
    worldX: number,
    worldZ: number,
    mapId: string
  ): [number, number] {
    const cfg = MAP_CONFIGS[mapId] ?? MAP_CONFIGS['AmbroseValley']
    const u = (worldX - cfg.originX) / cfg.scale
    const v = (worldZ - cfg.originZ) / cfg.scale
    const minimapPx = u * MINIMAP_SIZE
    const minimapPy = (1 - v) * MINIMAP_SIZE
    return [minimapPx, minimapPy]
  }

  /**
   * STEP 2 — 1024×1024 minimap pixel coordinates → canvas pixel coordinates
   *
   * The map image is drawn letterboxed inside the canvas. mapRect records
   * where it was drawn (top-left corner + dimensions). This step scales
   * the minimap coords into that rect so markers land on the correct spot.
   *
   *   canvasPx = mapRect.x + (minimapPx / 1024) * mapRect.w
   *   canvasPy = mapRect.y + (minimapPy / 1024) * mapRect.h
   */
  function minimapToCanvas(
    minimapPx: number,
    minimapPy: number
  ): [number, number] {
    const canvasPx = mapRect.x + (minimapPx / MINIMAP_SIZE) * mapRect.w
    const canvasPy = mapRect.y + (minimapPy / MINIMAP_SIZE) * mapRect.h
    return [canvasPx, canvasPy]
  }

  /**
   * FULL PIPELINE — World coordinates → canvas pixel coordinates
   *
   * Use this for every event marker and player path point.
   *
   * Usage:
   *   const [cx, cy] = worldToCanvas(row.x, row.z, selectedMap)
   *   ctx.arc(cx, cy, 4, 0, Math.PI * 2)
   */
  function worldToCanvas(
    worldX: number,
    worldZ: number,
    mapId: string
  ): [number, number] {
    const [minimapPx, minimapPy] = worldToMinimap(worldX, worldZ, mapId)
    return minimapToCanvas(minimapPx, minimapPy)
  }

 // ─── MILESTONE: draw one player's movement path ──────────────────────────
  // Built-in debug checkpoints — if the path doesn't show up, read the
  // console in order. Stop at the FIRST [CHECK] that looks wrong; that's
  // the broken step. Don't touch the pipeline above this point.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // CHECK 1 — is matchData arriving at all?
    console.log('[CHECK 1] matchData:', matchData ? `${matchData.rows.length} rows, map=${matchData.mapId}` : 'null')
    if (!matchData) return

    if (mapRect.w === 0 || mapRect.h === 0) {
      console.log('[CHECK 1b] mapRect not ready yet:', mapRect)
      return
    }

    // CHECK 2 — are movement rows found after filtering?
    const movementRows = matchData.rows
  .filter(r =>
    (r.event === 'Position'    && layers.humans) ||
    (r.event === 'BotPosition' && layers.bots)
  )
  .sort((a, b) => a.ts - b.ts)
    console.log('[CHECK 2] movementRows found:', movementRows.length)
    if (movementRows.length === 0) return

    // CHECK 3 — does worldToCanvas() return valid (non-NaN) coordinates?
    const firstPoint = worldToCanvas(movementRows[0].x, movementRows[0].z, matchData.mapId)
    console.log('[CHECK 3] first world point', movementRows[0].x, movementRows[0].z, '→ canvas', firstPoint, '| mapRect:', mapRect)
    if (Number.isNaN(firstPoint[0]) || Number.isNaN(firstPoint[1])) {
      console.error('[CHECK 3 FAILED] worldToCanvas returned NaN')
      return
    }

    // CHECK 4 — are the drawing commands actually executing?
    ctx.beginPath()
    ctx.strokeStyle = '#00FFFF'
    ctx.lineWidth = 2

    movementRows.forEach((row, i) => {
      const [cx, cy] = worldToCanvas(row.x, row.z, matchData.mapId)
      if (i === 0) ctx.moveTo(cx, cy)
      else ctx.lineTo(cx, cy)
    })

    ctx.stroke()
    console.log('[CHECK 4] stroke() called for', movementRows.length, 'points')
  }, [matchData, mapRect, layers])
// ─── LAYER 2: Kill / death markers ─────────────────────────────────────────
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  if (!matchData || mapRect.w === 0 || mapRect.h === 0) return

  if (!layers.kills && !layers.deaths) return
  const combatRows = matchData.rows.filter(r =>
    r.event === 'Kill'      ||
    r.event === 'BotKill'   ||
    r.event === 'Killed'    ||
    r.event === 'BotKilled'
  )

  // Print every unique event type in the full file + its count
const eventCounts = matchData.rows.reduce<Record<string, number>>((acc, r) => {
  acc[r.event] = (acc[r.event] ?? 0) + 1
  return acc
}, {})
console.log('[EVENT COUNTS]', eventCounts)
console.log('[KILLS/DEATHS] combat rows:', combatRows.length, combatRows.map(r => r.event))

combatRows.forEach(row => {
  const [cx, cy] = worldToCanvas(row.x, row.z, matchData.mapId)
  const isKill   = row.event === 'Kill' || row.event === 'BotKill'
  if (isKill  && !layers.kills)  return
  if (!isKill && !layers.deaths) return

    ctx.beginPath()
    ctx.arc(cx, cy, 6, 0, Math.PI * 2)
    ctx.fillStyle   = isKill ? '#f87171' : '#c084fc'
    ctx.globalAlpha = 0.85
    ctx.fill()

    ctx.beginPath()
    ctx.arc(cx, cy, 6, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth   = 1.5
    ctx.globalAlpha = 1
    ctx.stroke()
  })

  ctx.globalAlpha = 1
}, [matchData, mapRect, layers])

// ─── LAYER 3: Loot markers ──────────────────────────────────────────────────
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  if (!matchData || mapRect.w === 0 || mapRect.h === 0) return

  if (!layers.loot) return
  const lootRows = matchData.rows.filter(r => r.event === 'Loot')

  console.log('[LOOT] rows found:', lootRows.length)

  lootRows.forEach(row => {
    const [cx, cy] = worldToCanvas(row.x, row.z, matchData.mapId)

    ctx.beginPath()
    ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.fillStyle   = '#facc15'
    ctx.globalAlpha = 0.85
    ctx.fill()

    ctx.beginPath()
    ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth   = 1.5
    ctx.globalAlpha = 1
    ctx.stroke()
  })

  ctx.globalAlpha = 1
}, [matchData, mapRect, layers])

// ─── LAYER 4: Storm death markers ───────────────────────────────────────────
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  if (!matchData || mapRect.w === 0 || mapRect.h === 0) return

  if (!layers.storm) return

  const stormRows = matchData.rows.filter(r => r.event === 'KilledByStorm')

  console.log('[STORM] rows found:', stormRows.length)

  stormRows.forEach(row => {
    const [cx, cy] = worldToCanvas(row.x, row.z, matchData.mapId)

    ctx.beginPath()
    ctx.arc(cx, cy, 6, 0, Math.PI * 2)
    ctx.fillStyle   = '#34d399'
    ctx.globalAlpha = 0.85
    ctx.fill()

    ctx.beginPath()
    ctx.arc(cx, cy, 6, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth   = 1.5
    ctx.globalAlpha = 1
    ctx.stroke()
  })

  ctx.globalAlpha = 1
}, [matchData, mapRect, layers])

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden"
      style={{ background: '#0A0C10' }}
    >
      {/* Map image — CSS drop-shadow follows the PNG silhouette exactly */}
      <img
        src={imageSrc}
        alt={selectedMap}
        draggable={false}
        className="absolute select-none pointer-events-none"
        style={{
          objectFit: 'contain',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          height: '100%',
          filter: [
            'drop-shadow(0px 0px 6px rgba(111, 232, 245, 0.55))',
            'drop-shadow(0px 0px 25px rgba(111, 232, 245, 0.35))',
            'drop-shadow(0px 0px 60px rgba(111, 232, 245, 0.18))',
            'drop-shadow(0px 0px 120px rgba(111, 232, 245, 0.08))',
          ].join(' '),
        }}
      />
  
      {/* Canvas sits on top — for event markers, paths, heatmap only */}
      {/* mapRect is still set via the useEffect for coordinate pipeline */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
  
      {/* Map name badge */}
      <div className="absolute bottom-4 left-4 text-white/30 text-[11px] tracking-widest font-medium select-none pointer-events-none">
        {selectedMap.toUpperCase()}
      </div>
    </div>
  )
}