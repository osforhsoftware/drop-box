import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, transformWithOxc } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const legacyJsxPlugin = {
  name: "legacy-js-as-jsx",
  enforce: "pre",
  async transform(code, id) {
    if (!/[\\/]src[\\/].*\.js$/.test(id)) return null;
    return transformWithOxc(code, id, { lang: "jsx" });
  },
};

export default defineConfig({
  plugins: [legacyJsxPlugin, react({ include: /\.[jt]sx?$/ })],
  optimizeDeps: {
    rolldownOptions: {
      moduleTypes: {
        ".js": "jsx",
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  envPrefix: ["VITE_", "REACT_APP_"],
  server: {
    host: "localhost",
    port: 3000,
  },
});
