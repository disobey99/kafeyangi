import Link from "next/link";
import { Check } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthAnimationShowcase } from "@/components/auth-animation-showcase";
import { NooklineMark } from "@/components/nookline-mark";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const perks = [
    "QR menyu — mijoz stoldan buyurtma",
    "Ovozli kassa — yangi buyurtma darhol",
    "Oshxona va TV ekran real vaqtda",
    "Hisobotlar va ko'p filial",
  ];

  return (
    <div className="flex min-h-full flex-1">
      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-[#0a1614] p-12 lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#16A398] opacity-25 blur-[100px]" />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-[#E85A2A] opacity-12 blur-[80px]" />
        </div>
        <div className="relative">
          <Link href="/" className="flex items-center gap-2.5 text-white">
            <NooklineMark size={40} />
            <span className="text-xl font-extrabold">Nookline</span>
          </Link>
        </div>
        <div className="relative flex flex-1 flex-col justify-center py-6">
          <AuthAnimationShowcase />
          <h2 className="mt-8 text-3xl font-bold leading-snug text-white">
            Kafeingizni professional darajada boshqaring
          </h2>
          <ul className="mt-8 space-y-4">
            {perks.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-white/75">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#16A398]/25">
                  <Check className="h-3.5 w-3.5 text-[#2DD4BF]" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/40">© Nookline · O&apos;zbekiston</p>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="absolute right-4 top-4 md:right-8 md:top-8">
          <ThemeToggle />
        </div>
        <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
          <NooklineMark size={36} />
          <span className="text-lg font-extrabold">Nookline</span>
        </Link>
        <div className="card w-full max-w-md p-8 shadow-[var(--shadow-lg)]">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{subtitle}</p>
          </div>
          {children}
          {footer}
        </div>
      </div>
    </div>
  );
}
