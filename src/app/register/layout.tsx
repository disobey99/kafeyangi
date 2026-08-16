import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_TITLE, getSeoSiteUrl } from "@/lib/site-seo";

export const metadata: Metadata = {
  title: "Ro‘yxatdan o‘tish",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/register" },
  openGraph: {
    title: `Ro‘yxatdan o‘tish · ${SITE_TITLE}`,
    description: SITE_DESCRIPTION,
    url: `${getSeoSiteUrl()}/register`,
  },
  robots: { index: true, follow: true },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
