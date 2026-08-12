import type { MetadataRoute } from "next";

/** Asosiy (xodim) PWA — mijoz onlayn ilovasidan alohida */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/staff-app",
    name: "Nookline Xodim",
    short_name: "Nookline",
    description: "Kassa, ofitsiant va oshxona — Nookline xodimlar ilovasi",
    start_url: "/login",
    display: "standalone",
    background_color: "#0D111C",
    theme_color: "#0D111C",
    lang: "uz",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-staff.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-staff.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
