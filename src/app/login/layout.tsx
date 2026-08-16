import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_TITLE, getSeoSiteUrl } from "@/lib/site-seo";

export const metadata: Metadata = {
  title: "Kirish",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/login" },
  openGraph: {
    title: `Kirish · ${SITE_TITLE}`,
    description: SITE_DESCRIPTION,
    url: `${getSeoSiteUrl()}/login`,
  },
  robots: { index: true, follow: true },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
