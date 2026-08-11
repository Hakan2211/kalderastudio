import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

// NOTE: @tanstack/devtools-vite is deliberately NOT installed here. Its console
// bridge re-echoes every client log back through the server and nests the whole
// history in each message, which pinned the main thread at ~3fps once three.js
// emitted a single deprecation warning. This app is perf-critical; keep it out.
const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
})

export default config
