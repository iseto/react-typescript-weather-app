import { test } from "node:test";
import assert from "node:assert/strict";
import { compareFindings, findingsFrom } from "./security-audit-summary.mjs";

function report(overrides = {}) {
  return {
    auditReportVersion: 2,
    metadata: { vulnerabilities: { high: 1, total: 1 } },
    vulnerabilities: {
      example: { severity: "high", range: "<2.0.0", via: ["parent", { source: 123, severity: "high" }], fixAvailable: false, ...overrides },
    },
  };
}

test("first findings alert, unchanged findings do not", () => {
  const current = findingsFrom(report());
  assert.deepEqual(compareFindings(current, {}).changed, ["example"]);
  assert.deepEqual(compareFindings(current, current), { changed: [], resolved: [] });
});

test("a newly available fix and severity changes alert", () => {
  const previous = findingsFrom(report());
  for (const change of [{ fixAvailable: { name: "example", version: "2.0.0", isSemVerMajor: true } }, { severity: "critical" }]) {
    assert.deepEqual(compareFindings(findingsFrom(report(change)), previous).changed, ["example"]);
  }
});

test("npm ordering and dependency counts do not repeat alerts", () => {
  const previous = findingsFrom(report());
  const reordered = report({ via: [{ severity: "high", source: 123 }, "parent"] });
  reordered.metadata.dependencies = { total: 999 };
  assert.deepEqual(compareFindings(findingsFrom(reordered), previous).changed, []);
});

test("resolved findings clear the baseline and recurrence alerts", () => {
  const vulnerable = findingsFrom(report());
  const clean = findingsFrom({ ...report(), vulnerabilities: {}, metadata: { vulnerabilities: { total: 0 } } });
  assert.deepEqual(compareFindings(clean, vulnerable), { changed: [], resolved: ["example"] });
  assert.deepEqual(compareFindings(vulnerable, clean).changed, ["example"]);
});

test("registry errors and invalid reports fail instead of clearing findings", () => {
  for (const invalid of [{ error: { code: "ENETUNREACH" } }, {}, { ...report(), error: { message: "unavailable" } }, { ...report(), vulnerabilities: { broken: {} } }]) {
    assert.throws(() => findingsFrom(invalid));
  }
});
