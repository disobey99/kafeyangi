import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StaffManager } from "@/components/staff-manager";
import { getCafeStaffRatingMap } from "@/lib/staff-ratings";

export default async function StaffPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;

  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    include: {
      members: {
        where: { isActive: true },
        select: {
          id: true,
          role: true,
          pinHash: true,
          pinResetRequired: true,
          salary: true,
          lastActiveAt: true,
          user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cafe) notFound();

  const ratings = await getCafeStaffRatingMap(cafe.id);
  const members = cafe.members.map((member) => ({
    ...member,
    lastActiveAt: member.lastActiveAt?.toISOString() ?? null,
    rating: ratings[member.user.id] ?? { avgScore: 0, count: 0 },
  }));

  return <StaffManager cafeId={cafe.id} members={members} />;
}
