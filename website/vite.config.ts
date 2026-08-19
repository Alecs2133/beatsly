import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Versiunea aplicației desktop are o singură sursă de adevăr: package.json din
// rădăcina proiectului. O injectăm la build, ca link-urile de download de pe
// site să nu mai rămână în urmă față de release-ul real.
const appVersion = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')
).version as string

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
})
