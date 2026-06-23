import libReport from "istanbul-lib-report";
import reports from "istanbul-reports";

/**
 * Generate an HTML coverage report from an istanbul CoverageMap.
 * @param {import("istanbul-lib-coverage").CoverageMap} coverageMap
 * @param {{ outputDir: string, summarizer?: "nested" | "flat" | "pkg" }} options
 */
export function generateHtmlReport(coverageMap, options) {
  const context = libReport.createContext({
    dir: options.outputDir,
    defaultSummarizer: options.summarizer ?? "nested",
    coverageMap,
  });

  reports.create("html", {}).execute(context);
}
