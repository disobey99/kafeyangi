import { prisma } from "@/lib/prisma";

export async function syncMenuFromMainBranch(branchCafeId: string) {
  const branch = await prisma.cafe.findUnique({
    where: { id: branchCafeId },
    include: { group: { include: { cafes: true } } },
  });

  if (!branch?.groupId || !branch.group) {
    return { ok: false as const, error: "Filial tarmoqda emas" };
  }

  const main = branch.group.cafes.find((c) => c.isMainBranch) ?? branch.group.cafes[0];
  if (!main || main.id === branchCafeId) {
    return { ok: false as const, error: "Asosiy filial topilmadi" };
  }

  const mainCategories = await prisma.category.findMany({
    where: { cafeId: main.id, isActive: true },
    include: { products: true },
    orderBy: { sortOrder: "asc" },
  });

  await prisma.$transaction(async (tx) => {
    await tx.product.deleteMany({ where: { cafeId: branchCafeId } });
    await tx.category.deleteMany({ where: { cafeId: branchCafeId } });

    for (const cat of mainCategories) {
      const newCat = await tx.category.create({
        data: {
          cafeId: branchCafeId,
          name: cat.name,
          nameRu: cat.nameRu,
          nameEn: cat.nameEn,
          sortOrder: cat.sortOrder,
          isActive: cat.isActive,
        },
      });

      if (cat.products.length > 0) {
        await tx.product.createMany({
          data: cat.products.map((p) => ({
            cafeId: branchCafeId,
            categoryId: newCat.id,
            name: p.name,
            nameRu: p.nameRu,
            nameEn: p.nameEn,
            description: p.description,
            descriptionRu: p.descriptionRu,
            descriptionEn: p.descriptionEn,
            price: p.price,
            imageUrl: p.imageUrl,
            isAvailable: p.isAvailable,
            trackStock: false,
            stockQty: null,
            sortOrder: p.sortOrder,
          })),
        });
      }
    }
  });

  return { ok: true as const, syncedFrom: main.name };
}
