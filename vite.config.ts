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
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // three is ~600 kB that changes only when the dep is bumped, while
            // the scene code around it changes constantly. Kept separate it
            // survives deploys in the browser cache instead of being
            // re-downloaded with every shader tweak.
            { name: 'three', test: /[\\/]node_modules[\\/]three[\\/]/ },
            {
              name: 'postprocessing',
              test: /[\\/]node_modules[\\/](postprocessing|@react-three[\\/]postprocessing)[\\/]/,
            },
          ],
        },
      },
    },
  },
})

export default config
