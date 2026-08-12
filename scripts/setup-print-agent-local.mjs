/**
 * Lokal print-agent sozlash: token, stansiya USB printer, .print-agent.local.env
 * Usage: node scripts/setup-print-agent-local.mjs [printerName]
 */
import { createRequire } from "module";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

const printerName = (process.argv[2] || "THERMAL 203DPI Printer").trim();
const printerHost = printerName.toLowerCase().startsWith("usb:")
  ? printerName
  : `usb:${printerName}`;

const prisma = new PrismaClient();
const outFile = path.join(process.cwd(), ".print-agent.local.env");

try {
  let cafe = await prisma.cafe.findFirst({
    where: { slug: "demo-kafe" },
    select: { id: true, slug: true, name: true, printAgentToken: true },
  });
  if (!cafe) {
    cafe = await prisma.cafe.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true, slug: true, name: true, printAgentToken: true },
    });
  }
  if (!cafe) {
    console.error("Kafe topilmadi. Avval npm run db:seed qiling.");
    process.exit(1);
  }

  let token = cafe.printAgentToken;
  if (!token) {
    token = crypto.randomBytes(24).toString("hex");
    await prisma.cafe.update({
      where: { id: cafe.id },
      data: { printAgentToken: token },
    });
    console.log("Yangi print-agent token yaratildi.");
  } else {
    console.log("Mavjud print-agent token ishlatiladi.");
  }

  const stations = await prisma.prepStation.findMany({
    where: { cafeId: cafe.id, isActive: true },
    select: { id: true, name: true },
  });

  if (stations.length === 0) {
    await prisma.prepStation.create({
      data: {
        cafeId: cafe.id,
        name: "Oshxona",
        isDefault: true,
        printerHost,
        sortOrder: 0,
      },
    });
    console.log("Oshxona stansiyasi yaratildi.");
  } else {
    await prisma.prepStation.updateMany({
      where: { cafeId: cafe.id, isActive: true },
      data: { printerHost },
    });
    console.log(`Stansiyalar yangilandi (${stations.length} ta): ${printerHost}`);
  }

  const url = process.env.PRINT_AGENT_URL || "http://127.0.0.1:3000";
  const usbName = printerName.replace(/^usb:/i, "");
  const body = [
    `PRINT_AGENT_URL=${url}`,
    `PRINT_AGENT_CAFE_ID=${cafe.id}`,
    `PRINT_AGENT_TOKEN=${token}`,
    `PRINT_AGENT_PRINTER_HOST=${printerHost}`,
    `PRINT_AGENT_USB_PRINTER=${usbName}`,
    "",
  ].join("\n");

  fs.writeFileSync(outFile, body, "utf8");
  console.log(`OK: ${cafe.name} (${cafe.slug})`);
  console.log(`Env yozildi: ${outFile}`);
  console.log("Keyin: npm run print-agent:local");
} finally {
  await prisma.$disconnect();
}
