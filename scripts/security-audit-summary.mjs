import process from "node:process";
import console from "node:console";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Ignore npm's presentation order so equivalent reports do not repeat alerts.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

export function findingsFrom(audit) {
  if (audit.error || audit.auditReportVersion !== 2 || !audit.vulnerabilities || !audit.metadata?.vulnerabilities) {
    throw new Error("npm audit did not return a valid v2 report; the previous baseline has been preserved.");
  }
  return Object.fromEntries(Object.entries(audit.vulnerabilities).sort(([a], [b]) => a.localeCompare(b)).map(([name, item]) => {
    if (!item || typeof item.severity !== "string" || !Array.isArray(item.via) || !("fixAvailable" in item)) {
      throw new Error(`Invalid vulnerability record for ${name}`);
    }
    return [name, canonical({ severity: item.severity, range: item.range, via: item.via, fixAvailable: item.fixAvailable })];
  }));
}

export function compareFindings(current, previous) {
  return {
    changed: Object.keys(current).filter(name => JSON.stringify(current[name]) !== JSON.stringify(previous[name])),
    resolved: Object.keys(previous).filter(name => !(name in current)),
  };
}

function main() {
  const audit = JSON.parse(readFileSync("reports/security-audit.json", "utf8"));
  const current = findingsFrom(audit);
  const baselinePath = "reports/security-baseline.json";
  const hasBaseline = existsSync(baselinePath);
  const previous = hasBaseline ? JSON.parse(readFileSync(baselinePath, "utf8")) : {};
  const { changed, resolved } = compareFindings(current, previous);
  const lines = [
    "# Full dependency audit",
    "",
    "Scope: production and development dependencies from package-lock.json.",
    "",
    `Affected packages: ${Object.keys(current).length}. New/changed: ${changed.length}. Resolved: ${resolved.length}.`,
    "",
    hasBaseline ? "Compared with the previous completed audit. Unchanged findings remain outstanding." : "No cached baseline: current findings are reported as new.",
    "",
  ];
  for (const [name, finding] of Object.entries(current)) {
    const fix = finding.fixAvailable === false ? "no npm-reported fix" : `npm-reported fix: ${JSON.stringify(finding.fixAvailable)}`;
    lines.push(`- ${name}: ${finding.severity}; ${fix}${changed.includes(name) ? " (new/changed)" : " (unchanged)"}`);
  }
  if (resolved.length) lines.push("", `Resolved packages: ${resolved.join(", ")}.`);
  lines.push("", "See security-audit.json for advisory URLs and dependency paths. A reported fix still requires review and tests.", "");
  const summary = lines.join("\n");
  writeFileSync("reports/security-audit-summary.md", summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `alert=${changed.length > 0}\n`);
  writeFileSync(baselinePath, `${JSON.stringify(current, null, 2)}\n`);
  console.log(summary);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
