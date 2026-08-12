/**
 * .print-agent.local.env ni o'qib kitchen-print-agent ni ishga tushiradi.
 */
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const envFile = path.join(process.cwd(), ".print-agent.local.env");
if (!fs.existsSync(envFile)) {
  console.error(
    "Avval: npm run print-agent:setup -- \"THERMAL 203DPI Printer\"",
  );
  process.exit(1);
}

for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 1) continue;
  const key = t.slice(0, i).trim();
  const val = t.slice(i + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

const child = spawn(process.execPath, ["scripts/kitchen-print-agent.mjs"], {
  stdio: "inherit",
  env: process.env,
  cwd: process.cwd(),
});

child.on("exit", (code) => process.exit(code ?? 0));
