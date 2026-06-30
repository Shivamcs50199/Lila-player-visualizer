# LILA Player Journey Visualizer

An interactive desktop visualization tool built as part of the **LILA Games Product Engineer Assignment**.

The application visualizes gameplay telemetry from match files, allowing level designers and developers to inspect player movement, combat events, loot activity, and match progression directly on the game minimap.

---

## 🚀 Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- HTML5 Canvas
- DuckDB WASM

---

## ✨ Features

- Desktop-first replay experience
- Full match loading from gameplay telemetry
- Automatic match reconstruction from multiple player files
- Match Picker for selecting reconstructed matches
- Interactive minimap visualization
- Human and Bot movement layers
- Kill, Death, Loot and Storm event markers
- Timeline playback with scrubbing
- Event Inspector with detailed event information
- Layer visibility controls
- Heatmap visualization
- Progress overlay while loading large datasets
- Batched file parsing for improved performance

---

## ⚙️ Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

---

## 📂 Project Structure

```text
src/
├── assets/
├── components/
│   ├── layout/
│   ├── map/
│   ├── replay/
│   └── timeline/
├── lib/
├── types/
├── utils/
└── App.tsx
```

---

## 🚧 Project Status

The core requirements of the assignment have been completed.

The project currently supports loading complete matches, replaying player journeys, visualizing gameplay events, and inspecting match data through an interactive desktop interface.

Potential future improvements include:

- Map pan & zoom
- Player-specific path filtering
- Additional replay controls
- Performance optimizations for larger datasets

---

## 📄 License

Created for the **LILA Games Product Engineer Technical Assignment**.