/**
 * Capacitor debug APK yigish.
 *
 * Usage:
 *   node scripts/build-apk.mjs customer https://domen/c/slug/app
 *   node scripts/build-apk.mjs staff https://domen/login
 *   node scripts/build-apk.mjs courier https://domen/c/slug/app
 *
 * Talab: JDK 17+ va Android SDK (Android Studio).
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import { spawnSync } from "child_process";

const root = process.cwd();
const kind = (process.argv[2] || "").toLowerCase();
const urlArg = process.argv[3] || "";

if (!["customer", "staff", "courier"].includes(kind)) {
  console.error(
    "Usage:\n  node scripts/build-apk.mjs customer https://domen/c/slug/app\n  node scripts/build-apk.mjs staff https://domen/login\n  node scripts/build-apk.mjs courier https://domen/c/slug/app",
  );
  process.exit(1);
}

function loadEnvFile(dir) {
  const p = join(dir, ".env");
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

const appDir =
  kind === "staff" ? resolve(root, "staff-app") : resolve(root, "customer-app");

if (!existsSync(appDir)) {
  console.error("Papka topilmadi:", appDir);
  process.exit(1);
}

const fileEnv = loadEnvFile(appDir);
let serverUrl = urlArg;
if (!serverUrl) {
  serverUrl =
    kind === "staff"
      ? fileEnv.STAFF_APP_URL || process.env.STAFF_APP_URL
      : fileEnv.CUSTOMER_APP_URL || process.env.CUSTOMER_APP_URL;
}
if (!serverUrl) {
  console.error(
    kind === "staff"
      ? "STAFF_APP_URL kerak (https://domen/login)"
      : "CUSTOMER_APP_URL kerak (https://domen/c/slug/app)",
  );
  process.exit(1);
}
if (kind === "courier" && !/[?&]mode=courier\b/.test(serverUrl)) {
  serverUrl += serverUrl.includes("?") ? "&mode=courier" : "?mode=courier";
}

if (!serverUrl.startsWith("https://") && !serverUrl.startsWith("http://")) {
  console.error("URL http(s) bo'lishi kerak:", serverUrl);
  process.exit(1);
}

// Java: PATH yoki loyiha ichidagi portable JDK
const portable21 = resolve(root, ".tools", "jdk-21", "bin", "java.exe");
const portable17 = resolve(root, ".tools", "jdk-17", "bin", "java.exe");
const portableJava = existsSync(portable21)
  ? portable21
  : existsSync(portable17)
    ? portable17
    : null;
const javaBin = portableJava || "java";
const javaHome = portableJava
  ? resolve(portableJava, "..", "..")
  : process.env.JAVA_HOME;

const java = spawnSync(javaBin, ["-version"], { encoding: "utf8" });
const javaOut = `${java.stdout || ""}${java.stderr || ""}`;
if (java.error || !/version/i.test(javaOut)) {
  console.error(
    "Java topilmadi.\nAndroid Studio yoki JDK 17 o'rnating, yoki .tools/jdk-17 ni yuklang.",
  );
  process.exit(1);
}

const androidHome =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  (existsSync(resolve(process.env.LOCALAPPDATA || "", "Android", "Sdk"))
    ? resolve(process.env.LOCALAPPDATA, "Android", "Sdk")
    : "");
if (!androidHome || !existsSync(androidHome)) {
  console.error(
    "Android SDK topilmadi. Android Studio ni ochib SDK o'rnating.\nKutilgan: %LOCALAPPDATA%\\Android\\Sdk",
  );
  process.exit(1);
}
console.log("JAVA:", javaBin);
console.log("ANDROID_HOME:", androidHome);

const envKey = kind === "staff" ? "STAFF_APP_URL" : "CUSTOMER_APP_URL";
writeFileSync(join(appDir, ".env"), `${envKey}=${serverUrl}\n`, "utf8");
console.log(`[${kind}] URL → ${serverUrl}`);

function run(cmd, args, cwd) {
  console.log(">", cmd, args.join(" "));
  const r = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      [envKey]: serverUrl,
      JAVA_HOME: javaHome || process.env.JAVA_HOME,
      ANDROID_HOME: androidHome,
      ANDROID_SDK_ROOT: androidHome,
      PATH: javaHome
        ? `${resolve(javaHome, "bin")};${process.env.PATH || ""}`
        : process.env.PATH,
    },
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

run("npm", ["install"], appDir);

const androidDir = join(appDir, "android");
if (!existsSync(androidDir)) {
  run("npx", ["cap", "add", "android"], appDir);
}

run("npx", ["cap", "sync", "android"], appDir);
run("npm", ["run", "build:debug"], appDir);

const apk = join(
  appDir,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk",
);
if (existsSync(apk)) {
  console.log("\nOK APK:", apk);
  console.log("Telefoningizga nusxa qilib o'rnating (Noma'lum manbalar yoqilgan bo'lsin).");
} else {
  console.error("APK fayl topilmadi. Android Studio orqali ochib Build → APK qiling:");
  console.error("  cd", appDir, "&& npx cap open android");
  process.exit(1);
}
