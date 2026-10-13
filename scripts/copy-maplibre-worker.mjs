// MapLibre's inlined web worker doesn't survive Next's bundler, so the
// standalone CSP worker is served from public/ instead. Runs on install so
// it always matches the installed maplibre-gl.
import { copyFileSync } from "node:fs"

copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-csp-worker.js", "public/maplibre-gl-csp-worker.js")
