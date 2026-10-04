import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: [
      "packages/**/tests/**/*.test.ts",
      "apps/**/tests/**/*.test.ts"
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "apps/web/**"]
  }
});
