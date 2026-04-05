#!/usr/bin/env bun
/**
 * coverage-report.ts
 *
 * Post-processing script for Bun's LCOV output.
 * - Parses test-results/coverage/lcov.info
 * - Checks 90% thresholds (lines, branches, functions, statements)
 * - Writes coverage-summary.json and coverage-final.json (Istanbul format)
 * - Writes cobertura.xml
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, relative } from "path";

const ROOT = resolve(import.meta.dir, "..");
const LCOV_PATH = resolve(ROOT, "test-results/coverage/lcov.info");
const OUT_DIR = resolve(ROOT, "test-results/coverage");

const THRESHOLDS = { lines: 90, branches: 90, functions: 90, statements: 90 };

// ---------------------------------------------------------------------------
// LCOV parser
// ---------------------------------------------------------------------------
interface FileCoverage {
  path: string;
  functions: Map<string, { count: number; line: number }>;
  lines: Map<number, number>;
  branches: Map<string, number>;
  fnFound: number;
  fnHit: number;
  linesFound: number;
  linesHit: number;
  branchesFound: number;
  branchesHit: number;
}

function parseLcov(content: string): FileCoverage[] {
  const records: FileCoverage[] = [];
  let current: FileCoverage | null = null;

  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (line === "end_of_record") {
      if (current) records.push(current);
      current = null;
      continue;
    }
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const tag = line.slice(0, colon);
    const value = line.slice(colon + 1);

    switch (tag) {
      case "SF":
        current = {
          path: value,
          functions: new Map(),
          lines: new Map(),
          branches: new Map(),
          fnFound: 0,
          fnHit: 0,
          linesFound: 0,
          linesHit: 0,
          branchesFound: 0,
          branchesHit: 0,
        };
        break;
      case "FN": {
        if (!current) break;
        const [lineNum, ...rest] = value.split(",");
        const fnName = rest.join(",");
        current.functions.set(fnName, { count: 0, line: parseInt(lineNum, 10) });
        break;
      }
      case "FNDA": {
        if (!current) break;
        const commaIdx = value.indexOf(",");
        const count = parseInt(value.slice(0, commaIdx), 10);
        const fnName = value.slice(commaIdx + 1);
        const existing = current.functions.get(fnName);
        if (existing) existing.count = count;
        break;
      }
      case "FNF":
        if (current) current.fnFound = parseInt(value, 10);
        break;
      case "FNH":
        if (current) current.fnHit = parseInt(value, 10);
        break;
      case "DA": {
        if (!current) break;
        const [lineNum, count] = value.split(",");
        current.lines.set(parseInt(lineNum, 10), parseInt(count, 10));
        break;
      }
      case "LF":
        if (current) current.linesFound = parseInt(value, 10);
        break;
      case "LH":
        if (current) current.linesHit = parseInt(value, 10);
        break;
      case "BRDA": {
        if (!current) break;
        const parts = value.split(",");
        const key = `${parts[0]}-${parts[1]}-${parts[2]}`;
        const count = parts[3] === "-" ? 0 : parseInt(parts[3], 10);
        current.branches.set(key, count);
        break;
      }
      case "BRF":
        if (current) current.branchesFound = parseInt(value, 10);
        break;
      case "BRH":
        if (current) current.branchesHit = parseInt(value, 10);
        break;
    }
  }
  return records;
}

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------
interface Totals {
  lines: { found: number; hit: number };
  functions: { found: number; hit: number };
  branches: { found: number; hit: number };
}

function aggregate(records: FileCoverage[]): Totals {
  const t: Totals = {
    lines: { found: 0, hit: 0 },
    functions: { found: 0, hit: 0 },
    branches: { found: 0, hit: 0 },
  };
  for (const r of records) {
    t.lines.found += r.linesFound;
    t.lines.hit += r.linesHit;
    t.functions.found += r.fnFound;
    t.functions.hit += r.fnHit;
    t.branches.found += r.branchesFound;
    t.branches.hit += r.branchesHit;
  }
  return t;
}

function pct(hit: number, found: number): number {
  return found === 0 ? 100 : Math.round((hit / found) * 10000) / 100;
}

// ---------------------------------------------------------------------------
// Istanbul JSON
// ---------------------------------------------------------------------------
function buildSummaryJson(records: FileCoverage[], totals: Totals): object {
  const byFile: Record<string, object> = {};
  for (const r of records) {
    const relPath = relative(ROOT, r.path);
    byFile[relPath] = {
      lines: { total: r.linesFound, covered: r.linesHit, skipped: 0, pct: pct(r.linesHit, r.linesFound) },
      functions: { total: r.fnFound, covered: r.fnHit, skipped: 0, pct: pct(r.fnHit, r.fnFound) },
      branches: {
        total: r.branchesFound,
        covered: r.branchesHit,
        skipped: 0,
        pct: pct(r.branchesHit, r.branchesFound),
      },
      statements: { total: r.linesFound, covered: r.linesHit, skipped: 0, pct: pct(r.linesHit, r.linesFound) },
    };
  }
  return {
    total: {
      lines: {
        total: totals.lines.found,
        covered: totals.lines.hit,
        skipped: 0,
        pct: pct(totals.lines.hit, totals.lines.found),
      },
      functions: {
        total: totals.functions.found,
        covered: totals.functions.hit,
        skipped: 0,
        pct: pct(totals.functions.hit, totals.functions.found),
      },
      branches: {
        total: totals.branches.found,
        covered: totals.branches.hit,
        skipped: 0,
        pct: pct(totals.branches.hit, totals.branches.found),
      },
      statements: {
        total: totals.lines.found,
        covered: totals.lines.hit,
        skipped: 0,
        pct: pct(totals.lines.hit, totals.lines.found),
      },
    },
    ...byFile,
  };
}

function buildFinalJson(records: FileCoverage[]): object {
  const out: Record<string, object> = {};
  for (const r of records) {
    const relPath = relative(ROOT, r.path);
    const s: Record<string, number> = {};
    const sMap: Record<string, number> = {};
    const b: Record<string, [number, number]> = {};
    const bMap: Record<string, { loc: { start: { line: number }; end: { line: number } } }> = {};
    const f: Record<string, number> = {};
    const fnMap: Record<string, { name: string; decl: { start: { line: number } }; loc: { start: { line: number } } }> =
      {};

    let si = 0;
    for (const [line, count] of r.lines) {
      const id = String(si++);
      s[id] = count;
      sMap[id] = line;
    }

    let bi = 0;
    for (const [key, count] of r.branches) {
      const id = String(bi++);
      b[id] = [count, 0];
      const parts = key.split("-");
      bMap[id] = {
        loc: { start: { line: parseInt(parts[0], 10) }, end: { line: parseInt(parts[0], 10) } },
      };
    }

    let fi = 0;
    for (const [name, { count, line }] of r.functions) {
      const id = String(fi++);
      f[id] = count;
      fnMap[id] = { name, decl: { start: { line } }, loc: { start: { line } } };
    }

    out[relPath] = { path: r.path, statementMap: sMap, fnMap, branchMap: bMap, s, f, b };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Cobertura XML
// ---------------------------------------------------------------------------
function buildCobertura(records: FileCoverage[], totals: Totals): string {
  const lineRate = totals.lines.found === 0 ? 1 : totals.lines.hit / totals.lines.found;
  const branchRate = totals.branches.found === 0 ? 1 : totals.branches.hit / totals.branches.found;
  const timestamp = Math.floor(Date.now() / 1000);

  const classes = records
    .map((r) => {
      const relPath = relative(ROOT, r.path);
      const lr = r.linesFound === 0 ? 1 : r.linesHit / r.linesFound;
      const br = r.branchesFound === 0 ? 1 : r.branchesHit / r.branchesFound;
      const lines = [...r.lines.entries()]
        .map(([line, count]) => `      <line number="${line}" hits="${count}"/>`)
        .join("\n");
      return `    <class name="${relPath.replace(/\//g, ".")}" filename="${relPath}" line-rate="${lr.toFixed(4)}" branch-rate="${br.toFixed(4)}" complexity="0">
      <lines>
${lines}
      </lines>
    </class>`;
    })
    .join("\n");

  return `<?xml version="1.0" ?>
<coverage version="7.4.0" timestamp="${timestamp}" lines-valid="${totals.lines.found}" lines-covered="${totals.lines.hit}" line-rate="${lineRate.toFixed(4)}" branches-covered="${totals.branches.hit}" branches-valid="${totals.branches.found}" branch-rate="${branchRate.toFixed(4)}" complexity="0">
  <sources>
    <source>${ROOT}</source>
  </sources>
  <packages>
    <package name="." line-rate="${lineRate.toFixed(4)}" branch-rate="${branchRate.toFixed(4)}" complexity="0">
      <classes>
${classes}
      </classes>
    </package>
  </packages>
</coverage>
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
if (!existsSync(LCOV_PATH)) {
  console.error(`[coverage-report] LCOV file not found: ${LCOV_PATH}`);
  process.exit(1);
}

const content = readFileSync(LCOV_PATH, "utf8");
const records = parseLcov(content);
const totals = aggregate(records);

const linePct = pct(totals.lines.hit, totals.lines.found);
const branchPct = pct(totals.branches.hit, totals.branches.found);
const fnPct = pct(totals.functions.hit, totals.functions.found);

console.log(`\n[coverage-report]`);
console.log(`  Lines:     ${linePct}%  (${totals.lines.hit}/${totals.lines.found})`);
console.log(`  Branches:  ${branchPct}%  (${totals.branches.hit}/${totals.branches.found})`);
console.log(`  Functions: ${fnPct}%  (${totals.functions.hit}/${totals.functions.found})`);
console.log(`  Statements: ${linePct}%  (approx via lines)\n`);

writeFileSync(`${OUT_DIR}/coverage-summary.json`, JSON.stringify(buildSummaryJson(records, totals), null, 2));
writeFileSync(`${OUT_DIR}/coverage-final.json`, JSON.stringify(buildFinalJson(records), null, 2));
writeFileSync(`${OUT_DIR}/cobertura.xml`, buildCobertura(records, totals));

console.log(`[coverage-report] Artifacts written to ${OUT_DIR}`);

// Threshold enforcement
const failures: string[] = [];
if (linePct < THRESHOLDS.lines) failures.push(`Lines: ${linePct}% < ${THRESHOLDS.lines}%`);
if (branchPct < THRESHOLDS.branches) failures.push(`Branches: ${branchPct}% < ${THRESHOLDS.branches}%`);
if (fnPct < THRESHOLDS.functions) failures.push(`Functions: ${fnPct}% < ${THRESHOLDS.functions}%`);

if (failures.length > 0) {
  console.error(`\n[coverage-report] Coverage threshold(s) not met:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}

console.log("[coverage-report] All thresholds passed.");
