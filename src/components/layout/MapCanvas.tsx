import { useEffect, useRef, useState } from 'react'
import type { MatchData, MatchEvent } from '../../types/match'
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
  selectedMap:    string
  matchData:      MatchData | null
  layers:         LayerVisibility
  currentTime?:   number
  onEventSelect?: (event: MatchEvent) => void
}

// Tracks the exact pixel rect where the map image is drawn on the canvas.
// All event markers must use this rect to stay aligned with the map.
interface MapRect {
  x: number  // left edge of drawn map image in canvas pixels
  y: number  // top edge of drawn map image in canvas pixels
  w: number  // width of drawn map image in canvas pixels
  h: number  // height of drawn map image in canvas pixels
}

export default function MapCanvas({ selectedMap, matchData, layers, currentTime, onEventSelect }: MapCanvasProps) {
  const containerRef     = useRef<HTMLDivElement>(null)
  const canvasRef        = useRef<HTMLCanvasElement>(null)
const markersRef       = useRef<{ event: MatchEvent; cx: number; cy: number }[]>([])
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null)
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

    // Heatmap gets its own same-sized canvas, kept independent of the
    // event-marker canvas below.
    const heatmapCanvas = heatmapCanvasRef.current
    if (heatmapCanvas) {
      heatmapCanvas.width  = cw
      heatmapCanvas.height = ch
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.src = imageSrc

    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
    
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
    console.log('[CHECK 1c] currentTime:', currentTime, 'first ts:', matchData?.rows[0]?.ts)
    if (!matchData) return

    if (mapRect.w === 0 || mapRect.h === 0) {
      console.log('[CHECK 1b] mapRect not ready yet:', mapRect)
      return
    }

    // CHECK 2 — are movement rows found after filtering?
    const movementRows = matchData.rows
    .filter(r =>
      ((r.event === 'Position'    && layers.humans) ||
       (r.event === 'BotPosition' && layers.bots)) &&
      (currentTime === undefined || r.ts <= currentTime)
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
   // CHECK 4 — are the drawing commands actually executing?
    // Humans (Position) draw in cyan, Bots (BotPosition) draw in lime green —
    // same points, same order, just split into two strokes so the colors
    // don't mix. Coordinate conversion and filtering above are unchanged.
    const humanRows = movementRows.filter(r => r.event === 'Position')
    const botRows   = movementRows.filter(r => r.event === 'BotPosition')

    console.log(
      '[DIAGNOSTIC]',
      'Human rows:', humanRows.length,
      'Human players:', new Set(humanRows.map(r => r.user_id)).size,
      '| Bot rows:', botRows.length,
      'Bot players:', new Set(botRows.map(r => r.user_id)).size
    )

    function strokePath(rows: typeof movementRows, color: string) {
      if (rows.length === 0) return
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      rows.forEach((row, i) => {
        const [cx, cy] = worldToCanvas(row.x, row.z, matchData.mapId)
        if (i === 0) ctx.moveTo(cx, cy)
        else ctx.lineTo(cx, cy)
      })
      ctx.stroke()
    }

    strokePath(humanRows, '#00FFFF') // Humans — unchanged cyan
    strokePath(botRows, '#32CD32')   // Bots — lime green

    console.log('[CHECK 4] stroke() called for', movementRows.length, 'points (', humanRows.length, 'human,', botRows.length, 'bot )')
  }, [matchData, mapRect, layers, currentTime])

// ─── LAYER 2: Kill / death markers ─────────────────────────────────────────
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  if (!matchData || mapRect.w === 0 || mapRect.h === 0) return

  if (!layers.kills && !layers.deaths) return
  
  const combatRows = matchData.rows.filter(r =>
    (r.event === 'Kill'      ||
     r.event === 'BotKill'   ||
     r.event === 'Killed'    ||
     r.event === 'BotKilled') &&
    (currentTime === undefined || r.ts <= currentTime)
  )

  // Print every unique event type in the full file + its count
const eventCounts = matchData.rows.reduce<Record<string, number>>((acc, r) => {
  acc[r.event] = (acc[r.event] ?? 0) + 1
  return acc
}, {})
console.log('[EVENT COUNTS]', eventCounts)
console.log('[KILLS/DEATHS] combat rows:', combatRows.length, combatRows.map(r => r.event))
markersRef.current = []
console.log('[MARKERS] mapRect at storage time:', mapRect)
combatRows.forEach(row => {
  const [cx, cy] = worldToCanvas(row.x, row.z, matchData.mapId)
  const isKill   = row.event === 'Kill' || row.event === 'BotKill'
  if (isKill  && !layers.kills)  return
  if (!isKill && !layers.deaths) return
  console.log('[STORE MARKER] event:', row.event, 'world x:', row.x, 'z:', row.z, '→ canvas cx:', cx, 'cy:', cy, '| mapRect:', mapRect)
markersRef.current.push({ event: row, cx, cy })
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
}, [matchData, mapRect, layers, currentTime])

// ─── LAYER 3: Loot markers ──────────────────────────────────────────────────
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  if (!matchData || mapRect.w === 0 || mapRect.h === 0) return

  if (!layers.loot) return
  const lootRows = matchData.rows.filter(r => r.event === 'Loot' && (currentTime === undefined || r.ts <= currentTime))

  console.log('[LOOT] rows found:', lootRows.length)

  lootRows.forEach(row => {
    const [cx, cy] = worldToCanvas(row.x, row.z, matchData.mapId)
    markersRef.current.push({ event: row, cx, cy })

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
}, [matchData, mapRect, layers, currentTime])

// ─── LAYER 4: Storm death markers ───────────────────────────────────────────
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  if (!matchData || mapRect.w === 0 || mapRect.h === 0) return

  if (!layers.storm) return

  const stormRows = matchData.rows.filter(r =>
    r.event === 'KilledByStorm' &&
    (currentTime === undefined || r.ts <= currentTime)
  )

  console.log('[STORM] rows found:', stormRows.length)

  stormRows.forEach(row => {
    const [cx, cy] = worldToCanvas(row.x, row.z, matchData.mapId)
    markersRef.current.push({ event: row, cx, cy })

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
}, [matchData, mapRect, layers, currentTime])

  // ─── LAYER 5: Heatmap overlay ───────────────────────────────────────────────
  // Renders on its OWN dedicated canvas (heatmapCanvasRef), stacked between
  // the map image and the event-marker canvas. It is cleared and redrawn
  // here, but never touches canvasRef — so kills/deaths/loot/storm/path
  // markers on that other canvas are never erased by this effect.
  useEffect(() => {
    const canvas = heatmapCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Always clear this canvas first — if the layer is off, it just stays
    // blank, and nothing else on the page is affected.
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!matchData || mapRect.w === 0 || mapRect.h === 0) return
    if (!layers.heatmap) return
  
    const positionRows = matchData.rows.filter(
      r => r.event === 'Position' || r.event === 'BotPosition'
    )
    if (positionRows.length === 0) return
  
    const W = canvas.width
    const H = canvas.height
  
    // ── Step 1: Accumulate raw density grid ──────────────────────────────────
    const RADIUS = 14
    const SIGMA  = RADIUS / 2.0
    const density = new Float32Array(W * H)
  
    for (const row of positionRows) {
      const [cx, cy] = worldToCanvas(row.x, row.z, matchData.mapId)
      const x0 = Math.max(0, Math.floor(cx - RADIUS))
      const x1 = Math.min(W - 1, Math.ceil(cx + RADIUS))
      const y0 = Math.max(0, Math.floor(cy - RADIUS))
      const y1 = Math.min(H - 1, Math.ceil(cy + RADIUS))
      for (let py = y0; py <= y1; py++) {
        for (let px = x0; px <= x1; px++) {
          const dx = px - cx
          const dy = py - cy
          const d2 = dx * dx + dy * dy
          if (d2 > RADIUS * RADIUS) continue
          density[py * W + px] += Math.exp(-d2 / (2 * SIGMA * SIGMA))
        }
      }
    }
  
    // ── Step 2: Gaussian blur the density field ───────────────────────────────
    // Two-pass separable Gaussian blur (horizontal then vertical)
    const BLUR_RADIUS = 12
    const blurred = new Float32Array(W * H)
    const temp    = new Float32Array(W * H)
  
    // Build 1D Gaussian kernel
    const kernelSize = BLUR_RADIUS * 2 + 1
    const kernel = new Float32Array(kernelSize)
    let kernelSum = 0
    for (let k = 0; k < kernelSize; k++) {
      const x = k - BLUR_RADIUS
      kernel[k] = Math.exp(-(x * x) / (2 * (BLUR_RADIUS / 2) * (BLUR_RADIUS / 2)))
      kernelSum += kernel[k]
    }
    for (let k = 0; k < kernelSize; k++) kernel[k] /= kernelSum
  
    // Horizontal pass
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        let val = 0
        for (let k = 0; k < kernelSize; k++) {
          const sx = Math.min(W - 1, Math.max(0, px + k - BLUR_RADIUS))
          val += density[py * W + sx] * kernel[k]
        }
        temp[py * W + px] = val
      }
    }
  
    // Vertical pass
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        let val = 0
        for (let k = 0; k < kernelSize; k++) {
          const sy = Math.min(H - 1, Math.max(0, py + k - BLUR_RADIUS))
          val += temp[sy * W + px] * kernel[k]
        }
        blurred[py * W + px] = val
      }
    }
  
    // ── Step 3: Threshold — suppress weak density before colorizing ──────────
    // Single tunable constant. Raise it to suppress more weak movement and
    // keep only the strongest clusters; lower it to let fainter hotspots in.
    const THRESHOLD_PERCENTILE = 0.91
    const nonZero = Array.from(blurred).filter(v => v > 0).sort((a, b) => a - b)
    const threshold = nonZero[Math.floor(nonZero.length * THRESHOLD_PERCENTILE)] ?? 0
  
    // ── Step 4: Normalize ─────────────────────────────────────────────────────
    // Percentile-based "hottest" reference (instead of the single absolute
    // max pixel) — otherwise only one pixel on the whole map could ever
    // reach red/orange, and every other hotspot topped out blue.
    const maxD = nonZero[Math.floor(nonZero.length * 0.995)] ?? 0
    if (maxD === 0 || maxD <= threshold) return
  
    // ── Step 3.5: Drop any hotspot that never reaches the cyan/yellow stage ──
    // A single pixel's value alone can't tell "edge of a real hotspot" apart
    // from "entire peak of a weak one" — both look like deep blue. So we
    // flood-fill each connected blob of above-threshold pixels, find its
    // peak intensity, and only keep the blob if that peak clears the cyan
    // ramp. Genuine hotspots keep their full gradient, including blue edges;
    // weak ones are removed completely instead of drawing as a lone dot.
    const CYAN_STAGE = 0.20 // must match the blue→cyan breakpoint below
    const visited    = new Uint8Array(W * H)
    const validPixel = new Uint8Array(W * H) // 1 = belongs to a real hotspot

    for (let start = 0; start < W * H; start++) {
      if (visited[start] || blurred[start] <= threshold) continue

      const stack = [start]
      const blobPixels = [start]
      visited[start] = 1
      let peakT = 0

      while (stack.length > 0) {
        const idx = stack.pop()!
        const t = Math.min(1, (blurred[idx] - threshold) / (maxD - threshold))
        if (t > peakT) peakT = t

        const px = idx % W
        const py = Math.floor(idx / W)
        const neighbors = [
          px > 0     ? idx - 1 : -1,
          px < W - 1 ? idx + 1 : -1,
          py > 0     ? idx - W : -1,
          py < H - 1 ? idx + W : -1,
        ]
        for (const n of neighbors) {
          if (n < 0 || visited[n] || blurred[n] <= threshold) continue
          visited[n] = 1
          stack.push(n)
          blobPixels.push(n)
        }
      }

      if (peakT >= CYAN_STAGE) {
        for (const idx of blobPixels) validPixel[idx] = 1
      }
    }

    // ── Step 5: Colorize density field ───────────────────────────────────────
    // Color ramp: transparent → blue → cyan → yellow → orange → red
    function densityToColor(t: number): [number, number, number, number] {
      if (t <= 0)   return [0, 0, 0, 0]
      if (t < 0.20) {
        const s = t / 0.20
        return [0, 0, 200, Math.round(s * 120)]
      }
      if (t < 0.40) {
        const s = (t - 0.20) / 0.20
        return [0, Math.round(s * 220), 255, Math.round(120 + s * 60)]
      }
      if (t < 0.60) {
        const s = (t - 0.40) / 0.20
        return [Math.round(s * 255), 255, Math.round(255 - s * 255), Math.round(180 + s * 40)]
      }
      if (t < 0.80) {
        const s = (t - 0.60) / 0.20
        return [255, Math.round(255 - s * 165), 0, Math.round(220 + s * 20)]
      }
      {
        const s = (t - 0.80) / 0.20
        return [255, Math.round(90 - s * 90), 0, 240]
      }
    }
  
    const imageData = ctx.createImageData(W, H)
    const data = imageData.data
  
    for (let i = 0; i < blurred.length; i++) {
      if (blurred[i] <= threshold || !validPixel[i]) continue
      const t = Math.min(1, (blurred[i] - threshold) / (maxD - threshold))
      const [r, g, b, a] = densityToColor(Math.pow(t, 0.7))
      data[i * 4]     = r
      data[i * 4 + 1] = g
      data[i * 4 + 2] = b
      data[i * 4 + 3] = a
    }
  
    ctx.save()
    ctx.globalAlpha = 0.90
    ctx.putImageData(imageData, 0, 0)
    ctx.restore()
  
  }, [matchData, mapRect, layers, currentTime])

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden"
      style={{ background: '#0A0C10', cursor: 'crosshair' }}
      onClick={(e) => {
        const _canvas = canvasRef.current!
        const _canvasRect = _canvas.getBoundingClientRect()
        const _containerRect = containerRef.current!.getBoundingClientRect()
        console.log('[MEASURE] canvas internal:', _canvas.width, 'x', _canvas.height)
        console.log('[MEASURE] canvas CSS rect:', _canvasRect.width, 'x', _canvasRect.height)
        console.log('[MEASURE] container rect:', _containerRect.width, 'x', _containerRect.height)
        console.log('[MEASURE] first marker cx/cy:', markersRef.current[0]?.cx, markersRef.current[0]?.cy)
        console.log('[MEASURE] click clientX/Y:', e.clientX, e.clientY)
        console.log('[CLICK] mapRect at click time:', mapRect)
        const rect = canvasRef.current!.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        console.log('[CLICK] markers stored:', markersRef.current.length, 'at', mx, my)
          const hit = markersRef.current.find(m => {
          const dx = m.cx - mx
          const dy = m.cy - my
          return Math.sqrt(dx * dx + dy * dy) <= 10
        })
        if (hit && onEventSelect) onEventSelect(hit.event)
      }}
    >
      {/* Map image */}
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

      {/* Heatmap canvas — sits above map, below event markers */}
      <canvas
        ref={heatmapCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Event markers canvas — paths, kills, deaths, loot, storm */}
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