import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import RubyPlugin from "vite-plugin-ruby";
import { defineConfig } from "vite";

// The SPA source lives in app/frontend (see config/vite.json sourceCodeDir).
// `@` resolves to that root so imports read like `@/components/...`,
// mirroring tacticalvote's alias convention.
const frontendRoot = fileURLToPath(new URL("./app/frontend", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": frontendRoot,
    },
  },
  plugins: [react(), RubyPlugin()],
});
