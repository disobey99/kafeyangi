import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // ioredis Node built-ins (dns) — clientga bundlanmasin
  serverExternalPackages: ["ioredis"],
  // Dev rejimidagi pastdagi "Rendering" indikatorini yashirish
  devIndicators: false,
  // Telefon / tarmoq IP / Cloudflare tunnel dan dev ochganda
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "172.30.1.8",
    "192.168.*",
    "172.30.*",
    "10.*",
    "*.trycloudflare.com",
  ],
};

export default nextConfig;
