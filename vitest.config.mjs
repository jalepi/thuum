import { defineConfig } from "vitest/config";
import workspace from "./vitest.workspace.mjs";

export default defineConfig(({ mode }) => ({
  test: {
    workspace,
    environment: "happy-dom",
    reporters: mode === "ci" ? ["default", "junit"] : ["default"],
    outputFile: {
      junit: "./test-results/junit.xml",
    },
    coverage: {
      enabled: mode === "ci",
      include: ["**/src/**"],
      provider: "v8",
      reporter: [
        ["text"],
        ["json-summary"],
        ["json"],
        ["cobertura", { file: "cobertura.xml" }],
        ["html", { subdir: "html" }],
      ],
      reportsDirectory: "./test-results/coverage",
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
      },
    },
    restoreMocks: true,
  },
}));
