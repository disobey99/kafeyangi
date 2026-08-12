/**
 * Telegram webhook ulash (mijoz + support botlar).
 * Usage:
 *   node scripts/setup-telegram-webhook.mjs
 *   node scripts/setup-telegram-webhook.mjs https://xxxx.trycloudflare.com
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

async function setWebhook(token, webhookUrl, secret, label) {
  const me = await fetch(`https://api.telegram.org/bot${token}/getMe`).then(
    (r) => r.json(),
  );
  if (!me.ok) {
    console.error(`[${label}] Token noto'g'ri:`, me.description);
    return false;
  }
  console.log(`[${label}] Bot: @${me.result.username}`);

  const body = { url: webhookUrl };
  if (secret) body.secret_token = secret;

  const set = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

  if (!set.ok) {
    console.error(`[${label}] setWebhook xato:`, set.description);
    return false;
  }

  const info = await fetch(
    `https://api.telegram.org/bot${token}/getWebhookInfo`,
  ).then((r) => r.json());

  console.log(`[${label}] OK webhook:`, info.result?.url || webhookUrl);
  if (info.result?.last_error_message) {
    console.log(`[${label}] Oxirgi xato:`, info.result.last_error_message);
  }
  return true;
}

const env = loadEnv();
const customerToken = env.TELEGRAM_BOT_TOKEN;
if (!customerToken) {
  console.error("TELEGRAM_BOT_TOKEN .env da yo'q");
  process.exit(1);
}

const base =
  (process.argv[2] || env.TELEGRAM_WEBHOOK_BASE || env.NEXT_PUBLIC_APP_URL || "")
    .replace(/\/$/, "");
if (!base) {
  console.error(
    "HTTPS manzil kerak.\nMasalan: node scripts/setup-telegram-webhook.mjs https://xxxx.trycloudflare.com",
  );
  process.exit(1);
}

if (base.startsWith("http://")) {
  console.error(
    "Telegram webhook faqat HTTPS qabul qiladi.\nAvval: npm run tunnel\nKeyin shu HTTPS URL ni bering.",
  );
  process.exit(1);
}

const customerSecret = env.TELEGRAM_WEBHOOK_SECRET || "";
const supportSecret =
  env.TELEGRAM_SUPPORT_WEBHOOK_SECRET || env.TELEGRAM_WEBHOOK_SECRET || "";
const supportToken = env.TELEGRAM_SUPPORT_BOT_TOKEN || "";

let ok = await setWebhook(
  customerToken,
  `${base}/api/telegram/webhook`,
  customerSecret,
  "customer",
);

if (supportToken && supportToken !== customerToken) {
  const ok2 = await setWebhook(
    supportToken,
    `${base}/api/telegram/support-webhook`,
    supportSecret,
    "support",
  );
  ok = ok && ok2;
} else {
  console.log(
    "[support] TELEGRAM_SUPPORT_BOT_TOKEN yo'q — bitta bot (customer webhook) ishlatiladi.",
  );
}

if (!ok) process.exit(1);
console.log("Tayyor. Support botda /start → Support; mijoz botda /start → Buyurtma.");
