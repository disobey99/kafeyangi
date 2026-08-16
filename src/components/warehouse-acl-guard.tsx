"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Omborchi boshqa dashboard sahifalariga URL orqali kira olmasin */
export function WarehouseAclGuard({ cafeId }: { cafeId: string }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const prefix = `/dashboard/${cafeId}/warehouse`;
    if (!pathname.startsWith(prefix)) {
      router.replace(prefix);
    }
  }, [pathname, cafeId, router]);

  return null;
}
