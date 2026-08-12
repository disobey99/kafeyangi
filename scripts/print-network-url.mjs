import os from "os";

const nets = os.networkInterfaces();
const ips = [];

for (const name of Object.keys(nets)) {
  for (const net of nets[name] ?? []) {
    if (net.family === "IPv4" && !net.internal) {
      ips.push(net.address);
    }
  }
}

console.log("");
console.log("=== Telefondan ochish ===");
if (ips.length === 0) {
  console.log("Tarmoq IP topilmadi. Wi-Fi ulanganini tekshiring.");
} else {
  for (const ip of ips) {
    console.log(`  HTTP:  http://${ip}:3000`);
    console.log(`  HTTPS: https://${ip}:3000  (sertifikat ogohlantirishi chiqishi mumkin)`);
  }
}
console.log("");
console.log("Mikrofon (ratsiya) uchun HTTPS kerak. Eng oson yo'l:");
console.log("  1-terminal: npm run dev:phone");
console.log("  2-terminal: npm run tunnel");
console.log("  Telefonda tunnel bergan https://... manzilini oching.");
console.log("");
