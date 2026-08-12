import { prisma } from "@/lib/prisma";
import { ensureSlug } from "@/lib/utils";

export async function createGroupFromCafe(cafeId: string, groupName: string) {
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) return { error: "Kafe topilmadi" as const };
  if (cafe.groupId) return { error: "Kafe allaqachon tarmoqda" as const };

  const slug = ensureSlug(groupName, "tarmoq");

  const group = await prisma.cafeGroup.create({
    data: {
      name: groupName,
      slug,
      ownerId: cafe.ownerId,
    },
  });

  await prisma.cafe.update({
    where: { id: cafeId },
    data: { groupId: group.id, isMainBranch: true },
  });

  return { ok: true as const, group };
}

export async function addBranch(
  groupId: string,
  ownerId: string,
  data: { name: string; slug?: string; address?: string; phone?: string }
) {
  const group = await prisma.cafeGroup.findFirst({
    where: { id: groupId, ownerId },
    include: { cafes: { take: 1 } },
  });
  if (!group) return { error: "Tarmoq topilmadi" as const };

  const slug = ensureSlug(data.slug || data.name);
  const existing = await prisma.cafe.findUnique({ where: { slug } });
  if (existing) return { error: "Bu manzil band" as const };

  const mainCafe = group.cafes[0];

  const cafe = await prisma.cafe.create({
    data: {
      name: data.name,
      slug,
      address: data.address,
      phone: data.phone,
      ownerId,
      groupId,
      plan: mainCafe?.plan ?? "STARTER",
      status: mainCafe?.status ?? "TRIAL",
      trialEndsAt: mainCafe?.trialEndsAt,
      subscriptionEndsAt: mainCafe?.subscriptionEndsAt,
      members: { create: { userId: ownerId, role: "OWNER" } },
      categories: { create: { name: "Asosiy menyu", sortOrder: 1 } },
      prepStations: {
        create: { name: "Oshxona", sortOrder: 0, isDefault: true },
      },
      tables: {
        create: [1, 2, 3, 4, 5].map((n) => ({ number: n, name: `Stol ${n}` })),
      },
    },
  });

  return { ok: true as const, cafe };
}

export async function getGroupBranches(cafeId: string) {
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    include: {
      group: {
        include: {
          cafes: {
            orderBy: [{ isMainBranch: "desc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              slug: true,
              address: true,
              isMainBranch: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!cafe?.group) return { group: null, branches: [] };
  return { group: cafe.group, branches: cafe.group.cafes };
}

export async function getUserCafes(userId: string) {
  return prisma.cafe.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId, isActive: true } } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      groupId: true,
      isMainBranch: true,
      dashboardTheme: true,
      status: true,
      suspendReason: true,
      subscriptionEndsAt: true,
      trialEndsAt: true,
      group: { select: { name: true } },
      _count: { select: { products: true } },
    },
    orderBy: { name: "asc" },
  });
}
