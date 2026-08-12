import type { CapacitorConfig } from "@capacitor/cli";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

/** .env dagi CUSTOMER_APP_URL ni o'qiydi */
function loadLocalEnv() {
  const p = resolve(__dirname, ".env");
  if (!existsSync(p)) return;
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
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadLocalEnv();

/**
 * Mijoz / kuryer APK — onlayn PWA ni WebView da ochadi.
 *
 * Muhit:
 *   CUSTOMER_APP_URL=https://kafeyangi-avk6.vercel.app/m
 * Kuryer uchun:
 *   CUSTOMER_APP_URL=https://kafeyangi-avk6.vercel.app/c/KAFE-SLUG/app?mode=courier
 */
const serverUrl =
  process.env.CUSTOMER_APP_URL || "https://kafeyangi-avk6.vercel.app/m";

const cleartext = serverUrl.startsWith("http://");

const config: CapacitorConfig = {
  appId: "uz.nookline.mijoz",
  appName: "Nookline",
  webDir: "www",
  server: {
    url: serverUrl,
    cleartext,
  },
  android: {
    allowMixedContent: cleartext,
    backgroundColor: "#2AC1BC",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#2AC1BC",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#2AC1BC",
    },
  },
};

export default config;
