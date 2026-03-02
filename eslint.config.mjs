import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "node_modules/**",
    "apps/**/node_modules/**",
    "apps/**/dist/**",
    "apps/admin-web/.vite/**",
    "apps/api-server/uploads/**",
  ]),
]);
