import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const frontendRoot = fileURLToPath(new URL("./app/frontend", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": frontendRoot,
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["app/frontend/**/*.test.{ts,tsx}"],
    setupFiles: ["app/frontend/test/setup.ts"],
    css: false,
  },
});
