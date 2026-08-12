/**
 * Root-level Prisma prepare (Vercel postinstall / build).
 * scripts/ papkasiz ham ishlashi uchun loyiha ildizida turadi.
 */
const fs = require("fs");
const path = require("path");

const root = __dirname;
const schemaPath = path.join(root, "prisma", "schema.prisma");

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

loadEnvFile();

const arg = (process.argv[2] || "auto").toLowerCase();
const dbUrl = process.env.DATABASE_URL || "";

let provider;
if (arg === "sqlite" || arg === "postgresql") {
  provider = arg;
} else if (/^postgres(ql)?:\/\//i.test(dbUrl)) {
  provider = "postgresql";
} else if (process.env.VERCEL) {
  // Vercelda odatda Postgres
  provider = "postgresql";
} else {
  provider = "sqlite";
}

if (!fs.existsSync(schemaPath)) {
  console.error("prisma-prepare: prisma/schema.prisma topilmadi");
  process.exit(1);
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

if (next === schema && !schema.includes(`provider = "${provider}"`)) {
  console.error("prisma-prepare: provider qatori topilmadi");
  process.exit(1);
}

if (next !== schema) {
  fs.writeFileSync(schemaPath, next, "utf8");
}
console.log(`prisma provider → ${provider}`);
