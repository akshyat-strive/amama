"use client"

import * as maplibre from "maplibre-gl"

// MapLibre's inlined worker doesn't survive bundling, so the map tiles
// would never decode. The standalone worker is served from public/
// (copied there on install by scripts/copy-maplibre-worker.mjs).
const api = ((maplibre as unknown as { default?: typeof maplibre }).default ?? maplibre) as typeof maplibre
api.setWorkerUrl("/maplibre-gl-csp-worker.js")
