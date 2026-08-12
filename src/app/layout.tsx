import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { isTheme, resolveThemeForSSR } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nookline — Kafe boshqaruv tizimi",
  description: "QR menyu, buyurtmalar, kassa va hisobotlar",
  manifest: "/staff.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nookline Xodim",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ddd9d2" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0e0c" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themePreference = cookieStore.get("theme")?.value;
  const initialTheme = resolveThemeForSSR(
    isTheme(themePreference) ? themePreference : undefined,
  );

  return (
    <html
      lang="uz"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${initialTheme}`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <ThemeProvider>
          <AppShell />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
