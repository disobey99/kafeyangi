"use client";

export function LogoutButton({ className = "" }: { className?: string }) {
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`shrink-0 rounded-xl border border-[var(--dp-sidebar-border)] px-3 py-2.5 text-xs font-semibold text-[var(--dp-sidebar-muted)] transition hover:border-red-300 hover:text-red-400 ${className}`}
    >
      Chiqish
    </button>
  );
}
