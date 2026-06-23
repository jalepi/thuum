#!/usr/bin/env node
import { resolve } from "node:path";
import { parseLcovFile } from "./parse-lcov";
import { generateHtmlReport } from "./report";

const args = process.argv.slice(2);

let lcovPath;
let outputDir;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "-o" || args[i] === "--output") {
    outputDir = args[++i];
  } else if (!args[i].startsWith("-")) {
    lcovPath = args[i];
  }
}

if (!lcovPath) {
  console.error("Usage: tcc <lcov-file> -o <output-dir>");
  process.exit(1);
}

const resolvedLcov = resolve(lcovPath);
const resolvedOutput = resolve(outputDir ?? "coverage-html");

const map = parseLcovFile(resolvedLcov);
generateHtmlReport(map, { outputDir: resolvedOutput });

console.log(`HTML coverage report written to ${resolvedOutput}`);
