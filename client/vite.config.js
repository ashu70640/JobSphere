import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    allowedHosts: ['client_service', 'localhost'],
    // Dev proxy — forwards API calls to Nginx (Docker) or directly to services (local)
    proxy: {
      "/api/v1/auth": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
      "/api/v1/jobs": {
        target: "http://localhost:5002",
        changeOrigin: true,
      },
      "/api/admin": {
        target: "http://localhost:5003",
        changeOrigin: true,
      },
    },
  },
});
