/**
 * DATABASE_URL ga qarab Prisma provider ni sozlaydi.
 * postgres* → postgresql (Vercel/Neon)
 * file: / sqlite → sqlite (lokal)
 *
 * Usage: node scripts/prepare-prisma-schema.mjs [auto|sqlite|postgresql]
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const schemaPath = path.join(root, "prisma", "schema.prisma");

function loadEnvFile() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
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
} else {
  provider = "sqlite";
}

let schema = fs.readFileSync(schemaPath, "utf8");
const next = schema.replace(
  /datasource\s+db\s*\{[^}]*provider\s*=\s*"(sqlite|postgresql)"/,
  (block) => block.replace(/provider\s*=\s*"(sqlite|postgresql)"/, `provider = "${provider}"`),
);

if (next === schema && !schema.includes(`provider = "${provider}"`)) {
  console.error("prepare-prisma-schema: provider qatori topilmadi");
  process.exit(1);
}

fs.writeFileSync(schemaPath, next, "utf8");
console.log(`prisma provider → ${provider}`);
