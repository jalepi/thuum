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
      reporter: [["text"], ["cobertura", { file: "cobertura.xml" }], ["html", { subdir: "html" }]],
      reportsDirectory: "./test-results/coverage",
    },
    restoreMocks: true,
  },
}));
