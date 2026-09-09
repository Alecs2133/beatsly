import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf-8")
);

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  // Versiunea reală a aplicației în raportările de erori — citită din
  // package.json, nu hardcodată (ar rămâne în urmă la fiecare bump).
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    proxy: {
      '/hf-api': {
        target: 'https://api-inference.huggingface.co',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/hf-api/, '')
      }
    },
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
