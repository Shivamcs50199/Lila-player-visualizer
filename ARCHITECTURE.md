# Architecture

## Overview

The Player Journey Visualizer is a desktop-first React application that loads gameplay telemetry from `.nakama-0` files and reconstructs complete matches for visualization. The goal was to make it easy for level designers to replay player movement, inspect gameplay events, and identify gameplay patterns directly on the minimap.

---

## Tech Stack

| Technology | Why it was chosen |
|------------|-------------------|
| React | Component-based UI and state management |
| TypeScript | Type safety across gameplay data and UI |
| Vite | Fast development and build performance |
| Tailwind CSS | Quick and consistent UI styling |
| HTML5 Canvas | Efficient rendering of thousands of movement points and paths |
| DuckDB WASM | Read gameplay parquet files directly in the browser without a backend |

---

## Data Flow

```
.nakama-0 files
        │
        ▼
DuckDB WASM
        │
        ▼
parseMatchFile()
        │
        ▼
MatchData
        │
        ├────────► Timeline
        │
        ├────────► Map Canvas
        │
        ├────────► Event Inspector
        │
        └────────► Heatmap & Layer Filters
```

For full match loading, multiple `.nakama-0` files are parsed, grouped by `match_id`, merged into a single dataset, sorted by timestamp, and then passed through the existing visualization pipeline.

---

## Coordinate Mapping

Gameplay telemetry stores positions using world coordinates, while the minimap uses image coordinates.

A coordinate mapping function converts each world position into the correct pixel position on the minimap using calibrated map bounds. Every movement point and gameplay event uses the same mapping function, ensuring that player paths, kills, loot, and storm events all align correctly on the map.

---

## Assumptions

- Each `.nakama-0` file represents telemetry for one player within one match.
- Multiple files sharing the same `match_id` belong to the same match.
- Event timestamps are used to reconstruct chronological replay order.
- Some telemetry fields are sparse depending on the player and event type, so not every player generates the same amount of movement data.

---

## Trade-offs

| Decision | Reason |
|----------|--------|
| HTML5 Canvas instead of SVG | Better rendering performance for large numbers of movement points. |
| Batch parsing for large folder loads | Prevents browser freezes when loading hundreds of files. |
| Shared DuckDB instance | Avoids creating a new WASM engine for every file, significantly reducing memory usage. |
| Match Picker after parsing | Allows users to select a reconstructed match when multiple matches exist in the selected dataset instead of automatically loading one. |
| Desktop-first layout | Matches the assignment requirements and provides more screen space for replay and analysis. |