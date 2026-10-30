import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function vendorChunk(id) {
  if (!id.includes("node_modules")) return undefined;
  if (id.includes("fabric")) return "vendor-fabric";
  if (id.includes("framer-motion")) return "vendor-motion";
  if (id.includes("swiper")) return "vendor-swiper";
  if (id.includes("@radix-ui")) return "vendor-radix";
  if (id.includes("lucide-react")) return "vendor-icons";
  if (id.includes("react-dom") || id.includes("react-router") || /[/\\]react[/\\]/.test(id)) {
    return "vendor-react";
  }
  if (id.includes("@tanstack")) return "vendor-query";
  return "vendor";
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  envPrefix: ["VITE_", "REACT_APP_"],
  build: {
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
  server: {
    host: true,
    port: 3000,
    allowedHosts: true,
    watch: {
      ignored: ["**/dist.zip", "**/*.zip"],
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            if (res && !res.headersSent && typeof res.writeHead === "function") {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ detail: "Backend server unavailable on port 8000" }));
            }
          });
        },
      },
      "/uploads": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            if (res && !res.headersSent && typeof res.writeHead === "function") {
              res.writeHead(503, { "Content-Type": "text/plain" });
              res.end("Backend server unavailable");
            }
          });
        },
      },
    },
  },
});
