import { readFileSync } from "node:fs";
import libCoverage from "istanbul-lib-coverage";

/** @param {number} line */
const loc = (line) => ({
  start: { line, column: 0 },
  end: { line, column: 0 },
});

/**
 * Parse an lcov string into an istanbul CoverageMap.
 * @param {string} lcov
 * @returns {import("istanbul-lib-coverage").CoverageMap}
 */
export function parseLcov(lcov) {
  const map = libCoverage.createCoverageMap({});

  let file = "";
  /** @type {Record<string, import("istanbul-lib-coverage").FunctionMapping>} */
  let fnMap = {};
  /** @type {Record<string, number>} */
  let f = {};
  /** @type {Record<string, import("istanbul-lib-coverage").BranchMapping>} */
  let branchMap = {};
  /** @type {Record<string, number[]>} */
  let b = {};
  /** @type {Record<string, import("istanbul-lib-coverage").Range>} */
  let statementMap = {};
  /** @type {Record<string, number>} */
  let s = {};
  let fnIdx = 0;
  let stmtIdx = 0;

  function flush() {
    if (!file) return;
    map.addFileCoverage(
      libCoverage.createFileCoverage({
        path: file,
        fnMap,
        f,
        branchMap,
        b,
        statementMap,
        s,
      }),
    );
  }

  function reset() {
    fnMap = {};
    f = {};
    branchMap = {};
    b = {};
    statementMap = {};
    s = {};
    fnIdx = 0;
    stmtIdx = 0;
  }

  for (const line of lcov.split("\n")) {
    const t = line.trim();

    if (t.startsWith("SF:")) {
      file = t.slice(3);
      reset();
    } else if (t.startsWith("FN:")) {
      const [lineNo, ...rest] = t.slice(3).split(",");
      const name = rest.join(",");
      const key = String(fnIdx++);
      fnMap[key] = { name, decl: loc(+lineNo), loc: loc(+lineNo), line: +lineNo };
      f[key] = 0;
    } else if (t.startsWith("FNDA:")) {
      const [hits, ...rest] = t.slice(5).split(",");
      const name = rest.join(",");
      const key = Object.keys(fnMap).find((k) => fnMap[k].name === name);
      if (key !== undefined) f[key] = +hits;
    } else if (t.startsWith("BRDA:")) {
      const parts = t.slice(5).split(",");
      const [lineNo, blockNo, , taken] = parts;
      const hits = taken === "-" ? 0 : +taken;
      if (blockNo in branchMap) {
        branchMap[blockNo].locations.push(loc(+lineNo));
        b[blockNo].push(hits);
      } else {
        branchMap[blockNo] = { loc: loc(+lineNo), type: "if", locations: [loc(+lineNo)], line: +lineNo };
        b[blockNo] = [hits];
      }
    } else if (t.startsWith("DA:")) {
      const [lineNo, hits] = t.slice(3).split(",");
      const key = String(stmtIdx++);
      statementMap[key] = loc(+lineNo);
      s[key] = +hits;
    } else if (t === "end_of_record") {
      flush();
      file = "";
    }
  }

  return map;
}

/**
 * Parse an lcov file into an istanbul CoverageMap.
 * @param {string} path
 * @returns {import("istanbul-lib-coverage").CoverageMap}
 */
export function parseLcovFile(path) {
  return parseLcov(readFileSync(path, "utf-8"));
}
