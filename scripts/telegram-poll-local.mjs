/**
 * Lokal test: webhook o'rniga getUpdates (HTTPS tunnel kerak emas).
 * Avval: npm run dev
 * Keyin: node scripts/telegram-poll-local.mjs
 *
 * Ikki bot bo'lsa — ikkalasi ham poll qilinadi (turli webhook path).
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const p = resolve(process.cwd(), ".env");
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const env = loadEnv();
const customerToken = env.TELEGRAM_BOT_TOKEN;
if (!customerToken) {
  console.error("TELEGRAM_BOT_TOKEN .env da yo'q");
  process.exit(1);
}

const base = (env.TELEGRAM_POLL_TARGET || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const customerSecret = env.TELEGRAM_WEBHOOK_SECRET || "";
const supportSecret =
  env.TELEGRAM_SUPPORT_WEBHOOK_SECRET || env.TELEGRAM_WEBHOOK_SECRET || "";
const supportToken = env.TELEGRAM_SUPPORT_BOT_TOKEN || "";

const bots = [
  {
    label: "customer",
    token: customerToken,
    path: "/api/telegram/webhook",
    secret: customerSecret,
  },
];

if (supportToken && supportToken !== customerToken) {
  bots.push({
    label: "support",
    token: supportToken,
    path: "/api/telegram/support-webhook",
    secret: supportSecret,
  });
}

for (const b of bots) {
  await fetch(`https://api.telegram.org/bot${b.token}/deleteWebhook`).then(
    (r) => r.json(),
  );
  console.log(`[${b.label}] Webhook o'chirildi. Poll → ${base}${b.path}`);
}

console.log("Botlarda /start bosing. To'xtatish: Ctrl+C");

async function pollOne(bot, state) {
  const url = new URL(`https://api.telegram.org/bot${bot.token}/getUpdates`);
  url.searchParams.set("timeout", "25");
  url.searchParams.set("offset", String(state.offset));
  const data = await fetch(url).then((r) => r.json());
  if (!data.ok) {
    console.error(`[${bot.label}] getUpdates:`, data.description);
    await new Promise((r) => setTimeout(r, 2000));
    return;
  }
  for (const upd of data.result || []) {
    state.offset = upd.update_id + 1;
    const headers = { "Content-Type": "application/json" };
    if (bot.secret) headers["x-telegram-bot-api-secret-token"] = bot.secret;
    const res = await fetch(`${base}${bot.path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(upd),
    });
    console.log(
      `[${new Date().toLocaleTimeString()}] [${bot.label}] update ${upd.update_id} → ${res.status}`,
    );
  }
}

const states = bots.map(() => ({ offset: 0 }));
for (;;) {
  try {
    await Promise.all(bots.map((b, i) => pollOne(b, states[i])));
  } catch (e) {
    console.error("xato:", e.message || e);
    await new Promise((r) => setTimeout(r, 2000));
  }
}
