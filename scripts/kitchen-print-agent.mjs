/**
 * Oshxona chek agent — brauzer oynasisiz ishlaydi.
 *
 * Ishga tushirish:
 *   set PRINT_AGENT_URL=http://localhost:3000
 *   set PRINT_AGENT_CAFE_ID=cm...
 *   set PRINT_AGENT_TOKEN=...
 *   npm run print-agent
 *
 * Stansiya printerHost:
 *   192.168.1.50          — LAN (port 9100)
 *   192.168.1.50:9100     — LAN aniq port
 *   usb                   — USB (Windows printer / Linux /dev/usb/lp0)
 *   usb:EPSON TM-T20II    — USB, aniq Windows printer nomi
 *
 * Ixtiyoriy:
 *   PRINT_AGENT_PRINTER_HOST=usb
 *   PRINT_AGENT_USB_PRINTER=EPSON TM-T20II
 *   PRINT_AGENT_USB_DEVICE=/dev/usb/lp0
 *
 * Bo'sh navbatda poll sekinlashadi (2s → max 10s), ish chiqsa yana 2s.
 */
import net from "net";
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";

const BASE = (process.env.PRINT_AGENT_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const CAFE_ID = process.env.PRINT_AGENT_CAFE_ID || "";
const TOKEN = process.env.PRINT_AGENT_TOKEN || "";
const FALLBACK_HOST = process.env.PRINT_AGENT_PRINTER_HOST || "";
const USB_PRINTER_NAME = (process.env.PRINT_AGENT_USB_PRINTER || "").trim();
const USB_DEVICE =
  process.env.PRINT_AGENT_USB_DEVICE ||
  (process.platform === "linux" ? "/dev/usb/lp0" : "");
const MIN_INTERVAL_MS = Math.max(
  500,
  Number(process.env.PRINT_AGENT_INTERVAL_MS || 2000),
);
const MAX_INTERVAL_MS = Math.max(
  MIN_INTERVAL_MS,
  Number(process.env.PRINT_AGENT_MAX_INTERVAL_MS || 10_000),
);

if (!CAFE_ID || !TOKEN) {
  console.error(
    "PRINT_AGENT_CAFE_ID va PRINT_AGENT_TOKEN kerak.\nDashboard → Menyudagi stansiyalar / print agent token.",
  );
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function api(pathName, init = {}) {
  const res = await fetch(`${BASE}${pathName}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Print-Agent-Token": TOKEN,
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

/**
 * @returns {{ kind: "tcp", host: string, port: number } | { kind: "usb", printerName: string } | null}
 */
function parseTarget(raw) {
  const value = (raw || "").trim();
  if (!value) return null;

  const lower = value.toLowerCase();
  if (lower === "usb" || lower === "win" || lower.startsWith("usb:") || lower.startsWith("win:")) {
    let name = "";
    if (lower.startsWith("usb:") || lower.startsWith("win:")) {
      name = value.slice(value.indexOf(":") + 1).trim();
    }
    name = name || USB_PRINTER_NAME;
    return { kind: "usb", printerName: name };
  }

  // IP yoki hostname:port
  if (/^[\d.]+$/.test(value) || value.includes(":") || /^[a-z0-9.-]+$/i.test(value)) {
    const [host, portStr] = value.split(":");
    const port = portStr ? Number(portStr) : 9100;
    if (!host || !Number.isFinite(port)) return null;
    // "usb" allaqachon ushlangan; oddiy so'zni IP emas deb hisoblamaymiz agar nuqta yo'q
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host) && !portStr && !host.includes(".")) {
      // Windows printer nomi (masalan "EPSON TM-T20") — USB yo'li
      return { kind: "usb", printerName: value };
    }
    return { kind: "tcp", host, port };
  }

  return { kind: "usb", printerName: value };
}

function sendTcp(host, port, buffer) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port }, () => {
      socket.write(buffer, (err) => {
        if (err) {
          reject(err);
          return;
        }
        socket.end();
        resolve();
      });
    });
    socket.setTimeout(8000, () => {
      socket.destroy();
      reject(new Error("Printer timeout"));
    });
    socket.on("error", reject);
  });
}

function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      { windowsHide: true },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || stdout.trim() || `PowerShell exit ${code}`));
    });
  });
}

async function resolveWindowsPrinterName(preferred) {
  if (preferred) return preferred;

  const listed = await runPowerShell(
    "Get-Printer | Select-Object -ExpandProperty Name",
  );
  const names = listed
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (names.length === 0) {
    throw new Error(
      "Windows printer topilmadi. Sozlamalar → Printerlar da USB printer o'rnatilganligini tekshiring.",
    );
  }

  const rank = (n) => {
    const s = n.toLowerCase();
    if (/tm-|epson|xprinter|rongta|pos-|thermal|receipt|chek|xp-/.test(s)) return 0;
    if (/pdf|onenote|xps|fax|microsoft/.test(s)) return 2;
    return 1;
  };
  names.sort((a, b) => rank(a) - rank(b));
  return names[0];
}

async function sendUsbWindows(printerName, buffer) {
  const name = await resolveWindowsPrinterName(printerName);
  const tmp = path.join(os.tmpdir(), `kafe-print-${Date.now()}-${process.pid}.bin`);
  fs.writeFileSync(tmp, buffer);

  const printerLit = name.replace(/'/g, "''");
  const fileLit = tmp.replace(/'/g, "''");

  const script = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

  public static bool SendFileToPrinter(string szPrinterName, string szFileName) {
    IntPtr hPrinter;
    if (!OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) return false;
    var di = new DOCINFOA();
    di.pDocName = "Nookline Kitchen";
    di.pDataType = "RAW";
    try {
      if (!StartDocPrinter(hPrinter, 1, di)) return false;
      try {
        if (!StartPagePrinter(hPrinter)) return false;
        try {
          byte[] bytes = System.IO.File.ReadAllBytes(szFileName);
          IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
          Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
          int dwWritten;
          bool ok = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
          Marshal.FreeCoTaskMem(pUnmanagedBytes);
          return ok;
        } finally { EndPagePrinter(hPrinter); }
      } finally { EndDocPrinter(hPrinter); }
    } finally { ClosePrinter(hPrinter); }
  }
}
"@
$ok = [RawPrinterHelper]::SendFileToPrinter('${printerLit}', '${fileLit}')
if (-not $ok) { throw "USB printerga yozib bo'lmadi: ${printerLit}" }
Write-Output '${printerLit}'
`;

  try {
    const used = await runPowerShell(script);
    return used || name;
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

function sendUsbLinux(buffer) {
  const device = USB_DEVICE || "/dev/usb/lp0";
  return new Promise((resolve, reject) => {
    fs.writeFile(device, buffer, (err) => {
      if (err) reject(new Error(`${device}: ${err.message}`));
      else resolve(device);
    });
  });
}

async function sendBuffer(target, buffer) {
  if (target.kind === "tcp") {
    await sendTcp(target.host, target.port, buffer);
    return `${target.host}:${target.port}`;
  }
  if (process.platform === "win32") {
    return sendUsbWindows(target.printerName, buffer);
  }
  return sendUsbLinux(buffer);
}

async function processOnce() {
  const { jobs } = await api(`/api/cafes/${CAFE_ID}/print-jobs?limit=5`);
  if (!jobs?.length) return { empty: true, done: 0 };

  let done = 0;
  for (const job of jobs) {
    const claimed = await api(`/api/cafes/${CAFE_ID}/print-jobs`, {
      method: "POST",
      body: JSON.stringify({ action: "claim", jobId: job.id }),
    });
    const target =
      parseTarget(claimed.job?.printerHost) ||
      parseTarget(FALLBACK_HOST) ||
      (USB_PRINTER_NAME ? { kind: "usb", printerName: USB_PRINTER_NAME } : null);
    if (!target) {
      await api(`/api/cafes/${CAFE_ID}/print-jobs`, {
        method: "POST",
        body: JSON.stringify({
          action: "fail",
          jobId: job.id,
          error: "printerHost yo'q — stansiyaga IP yoki usb yozing",
        }),
      });
      console.warn(`[skip] ${job.id} — printerHost yo'q`);
      continue;
    }
    if (!claimed.job?.escposBase64) {
      await api(`/api/cafes/${CAFE_ID}/print-jobs`, {
        method: "POST",
        body: JSON.stringify({
          action: "fail",
          jobId: job.id,
          error: "escpos yo'q",
        }),
      });
      continue;
    }

    try {
      const buf = Buffer.from(claimed.job.escposBase64, "base64");
      const dest = await sendBuffer(target, buf);
      await api(`/api/cafes/${CAFE_ID}/print-jobs`, {
        method: "POST",
        body: JSON.stringify({ action: "done", jobId: job.id }),
      });
      console.log(`[ok] #${claimed.job.payload?.orderNumber} → ${dest}`);
      done += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await api(`/api/cafes/${CAFE_ID}/print-jobs`, {
        method: "POST",
        body: JSON.stringify({
          action: "fail",
          jobId: job.id,
          error: msg,
        }),
      });
      console.error(`[fail] ${job.id}: ${msg}`);
    }
  }
  return { empty: false, done };
}

function nextIdleDelay(current) {
  return Math.min(MAX_INTERVAL_MS, Math.round(current * 1.5));
}

console.log(`Print agent: ${BASE} cafe=${CAFE_ID}`);
console.log(
  `Fallback printer: ${FALLBACK_HOST || "(stansiya printerHost)"}`,
);
if (USB_PRINTER_NAME) console.log(`USB printer name: ${USB_PRINTER_NAME}`);
console.log(
  `Poll: ${MIN_INTERVAL_MS}ms → max ${MAX_INTERVAL_MS}ms (bo'shda backoff)`,
);
console.log(
  "USB: stansiyaga `usb` yoki `usb:Printer nomi` yozing. Printer Windowsda o'rnatilgan bo'lishi kerak.",
);

let delayMs = MIN_INTERVAL_MS;

while (true) {
  try {
    const { empty } = await processOnce();
    delayMs = empty ? nextIdleDelay(delayMs) : MIN_INTERVAL_MS;
  } catch (e) {
    console.error("Poll xato:", e instanceof Error ? e.message : e);
    delayMs = nextIdleDelay(Math.max(delayMs, MIN_INTERVAL_MS));
  }
  await sleep(delayMs);
}
