/**
 * Vercel / npm postinstall — Prisma provider + generate.
 * prepare-prisma-schema.mjs bo'lmasa ham o'zi ishlaydi (GitHubda skript
 * unutilgan bo'lsa build yiqilmasin).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(root, "prisma", "schema.prisma");
const prepareScript = path.join(root, "scripts", "prepare-prisma-schema.mjs");

function loadEnvFile() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function setProvider(provider) {
  if (!fs.existsSync(schemaPath)) {
    console.warn("prisma-postinstall: schema.prisma topilmadi");
    return;
  }
  let schema = fs.readFileSync(schemaPath, "utf8");
  const next = schema.replace(
    /datasource\s+db\s*\{[^}]*provider\s*=\s*"(sqlite|postgresql)"/,
    (block) =>
      block.replace(
        /provider\s*=\s*"(sqlite|postgresql)"/,
        `provider = "${provider}"`,
      ),
  );
  if (next !== schema) {
    fs.writeFileSync(schemaPath, next, "utf8");
  }
  console.log(`prisma provider → ${provider}`);
}

loadEnvFile();

const dbUrl = process.env.DATABASE_URL || "";
const provider = /^postgres(ql)?:\/\//i.test(dbUrl) ? "postgresql" : "sqlite";

if (fs.existsSync(prepareScript)) {
  const r = spawnSync(process.execPath, [prepareScript, "auto"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    console.warn("prepare-prisma-schema failed — inline fallback");
    setProvider(provider);
  }
} else {
  console.warn(
    "scripts/prepare-prisma-schema.mjs yo'q — inline provider sozlandi",
  );
  setProvider(provider);
}

const gen = spawnSync("npx", ["prisma", "generate"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: true,
});

process.exit(gen.status ?? 1);
