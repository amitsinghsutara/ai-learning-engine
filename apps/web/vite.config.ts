import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev-only proxy so the browser can call the API's real route paths
// (e.g. /learners/:id) without needing CORS configured on the API.
const API_TARGET = "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/learners": API_TARGET,
      "/health": API_TARGET
    }
  }
});
