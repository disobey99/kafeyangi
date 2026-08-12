import { NextRequest, NextResponse } from "next/server";
import { requireCafeStaff } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeStaff(cafeId);
    if (!access.ok) return access.response;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const activeMembers = await prisma.cafeMember.findMany({
      where: {
        cafeId,
        isActive: true,
        lastActiveAt: { gte: fiveMinutesAgo },
      },
      select: {
        id: true,
        role: true,
        lastActiveAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { lastActiveAt: "desc" },
    });

    const list = activeMembers.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      role: m.role,
      avatarUrl: m.user.avatarUrl,
      lastActiveAt: m.lastActiveAt,
    }));

    return NextResponse.json({ activeStaff: list });
  } catch (error) {
    console.error("Error fetching active staff:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
