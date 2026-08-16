import { CafeRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MANAGER_ROLES: CafeRole[] = [CafeRole.OWNER, CafeRole.MANAGER];

/** Egasi, nazoratchi, omborchi — ombor API */
const INVENTORY_ROLES: CafeRole[] = [
  CafeRole.OWNER,
  CafeRole.MANAGER,
  CafeRole.WAREHOUSE,
];

const STAFF_ROLES: CafeRole[] = [
  CafeRole.OWNER,
  CafeRole.MANAGER,
  CafeRole.CASHIER,
  CafeRole.WAITER,
  CafeRole.KITCHEN,
  CafeRole.COURIER,
  CafeRole.WAREHOUSE,
];

const UNAUTH = NextResponse.json(
  {
    error: "Sessiya tugagan yoki AUTH_SECRET o'zgargan. Qayta kiring.",
    code: "UNAUTHORIZED",
    reauth: true,
  },
  { status: 401 },
);

export async function getCafeMembership(userId: string, cafeId: string) {
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    include: {
      members: { where: { userId, isActive: true } },
    },
  });

  if (!cafe) return null;

  if (cafe.ownerId === userId) {
    return { cafe, role: CafeRole.OWNER };
  }

  const member = cafe.members[0];
  if (!member) return null;

  return { cafe, role: member.role };
}

type AccessResult =
  | {
      ok: true;
      session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
      cafe: { id: string };
      role: CafeRole;
    }
  | { ok: false; response: NextResponse };

export async function requireCafeManager(cafeId: string): Promise<AccessResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: UNAUTH };
  }

  if (isSuperAdmin(session)) {
    const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
    if (!cafe) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Kafe topilmadi" }, { status: 404 }),
      };
    }
    return { ok: true, session, cafe, role: CafeRole.OWNER };
  }

  const membership = await getCafeMembership(session.userId, cafeId);
  if (!membership) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 }),
    };
  }

  if (!MANAGER_ROLES.includes(membership.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Faqat egasi yoki nazoratchi" },
        { status: 403 },
      ),
    };
  }

  prisma.cafeMember
    .update({
      where: { cafeId_userId: { cafeId, userId: session.userId } },
      data: { lastActiveAt: new Date() },
    })
    .catch(() => {});

  return {
    ok: true,
    session,
    cafe: membership.cafe,
    role: membership.role,
  };
}

export async function requireCafeCourier(cafeId: string): Promise<AccessResult> {
  return requireCafeStaff(cafeId, [
    CafeRole.COURIER,
    CafeRole.OWNER,
    CafeRole.MANAGER,
  ]);
}

/** Ombor moduli — egasi / nazoratchi / omborchi */
export async function requireCafeInventory(cafeId: string): Promise<AccessResult> {
  const result = await requireCafeStaff(cafeId, INVENTORY_ROLES);
  if (!result.ok) {
    if (result.response.status === 403) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Faqat egasi, nazoratchi yoki omborchi" },
          { status: 403 },
        ),
      };
    }
  }
  return result;
}

export async function requireCafeStaff(
  cafeId: string,
  roles: CafeRole[] = STAFF_ROLES,
): Promise<AccessResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: UNAUTH };
  }

  if (isSuperAdmin(session)) {
    const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
    if (!cafe) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Kafe topilmadi" }, { status: 404 }),
      };
    }
    return { ok: true, session, cafe, role: CafeRole.OWNER };
  }

  const membership = await getCafeMembership(session.userId, cafeId);
  if (!membership) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 }),
    };
  }

  if (!roles.includes(membership.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 }),
    };
  }

  prisma.cafeMember
    .update({
      where: { cafeId_userId: { cafeId, userId: session.userId } },
      data: { lastActiveAt: new Date() },
    })
    .catch(() => {});

  return {
    ok: true,
    session,
    cafe: membership.cafe,
    role: membership.role,
  };
}

export async function requireProductAccess(
  productId: string,
): Promise<
  | (AccessResult & { ok: true; productId: string })
  | { ok: false; response: NextResponse }
> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, cafeId: true },
  });

  if (!product) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 }),
    };
  }

  const access = await requireCafeManager(product.cafeId);
  if (!access.ok) return access;

  return { ...access, productId: product.id };
}

export async function requireCategoryAccess(categoryId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, cafeId: true },
  });

  if (!category) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Kategoriya topilmadi" }, { status: 404 }),
    };
  }

  const access = await requireCafeManager(category.cafeId);
  if (!access.ok) return access;

  return { ...access, categoryId: category.id };
}
