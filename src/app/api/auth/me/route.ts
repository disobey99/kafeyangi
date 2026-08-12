import { NextResponse } from "next/server";
import { getSessionAndClearIfRevoked } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLoginRedirect } from "@/lib/staff-redirect";

export async function GET() {
  const session = await getSessionAndClearIfRevoked();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      globalRole: true,
      memberships: {
        where: { isActive: true },
        include: {
          cafe: { select: { id: true, name: true, slug: true, status: true } },
        },
      },
      ownedCafes: {
        select: { id: true, name: true, slug: true, status: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const redirectTo = await getLoginRedirect(session.userId, session.globalRole);

  return NextResponse.json({ user, redirectTo });
}
