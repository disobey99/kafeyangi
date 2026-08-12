import type { CapacitorConfig } from "@capacitor/cli";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

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
 * Xodimlar APK — saytni WebView ichida ochadi.
 *
 *   STAFF_APP_URL=https://kafeyangi-avk6.vercel.app/m
 */
const serverUrl = process.env.STAFF_APP_URL || "https://kafeyangi-avk6.vercel.app/m";
const cleartext = serverUrl.startsWith("http://");

const config: CapacitorConfig = {
  appId: "uz.nookline.xodim",
  appName: "Nookline Xodim",
  webDir: "www",
  server: {
    url: serverUrl,
    cleartext,
  },
  android: {
    allowMixedContent: cleartext,
    backgroundColor: "#0D111C",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#0D111C",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0D111C",
    },
  },
};

export default config;
