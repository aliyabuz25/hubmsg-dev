import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/admin/",
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:2005",
      "/logout": "http://localhost:2005",
      "/admin/config": "http://localhost:2005",
      "/admin/clients": "http://localhost:2005",
      "/admin/devices": "http://localhost:2005",
      "/admin/queue": "http://localhost:2005",
      "/admin/ops-metrics": "http://localhost:2005",
      "/admin/templates": "http://localhost:2005",
      "/admin/profile": "http://localhost:2005",
      "/admin/security": "http://localhost:2005",
    },
  },
});
