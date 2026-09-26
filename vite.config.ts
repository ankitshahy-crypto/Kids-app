import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * GitHub Pages serves this repo at https://ankitshahy-crypto.github.io/Kids-app/
 * so built asset URLs must start with /Kids-app/.
 * The installed iPhone app sets VITE_BASE=./ (see npm run ios:sync) so the
 * Capacitor WebView can load those same files from disk.
 */
const base = process.env.VITE_BASE || "/Kids-app/";

export default defineConfig({
  plugins: [react()],
  base,
});
