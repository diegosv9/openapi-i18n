import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    extensionAlias: {
      ".js": [".ts", ".js"],
    },
  },
  test: {
    include: ["scripts/tests/**/*.test.ts"],
    coverage: {
      provider: "custom",
      customProviderModule: "vitest-monocart-coverage",
      include: ["scripts/lib/**/*.ts"],
      exclude: [],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
})
