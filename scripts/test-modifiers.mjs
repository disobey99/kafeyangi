import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
try {
  const product = await p.product.findFirst({ select: { id: true, name: true } });
  console.log("product", product);
  await p.productModifierGroup.deleteMany({ where: { productId: product.id } });
  const g = await p.productModifierGroup.create({
    data: {
      productId: product.id,
      name: "taom",
      required: true,
      minSelect: 1,
      maxSelect: 1,
      sortOrder: 0,
      options: {
        create: [
          { name: "kichik", priceDelta: 1500000, sortOrder: 0 },
          { name: "katta", priceDelta: 2000000, sortOrder: 1 },
        ],
      },
    },
  });
  console.log("created", g.id);
} catch (e) {
  console.error("ERR", e.message);
} finally {
  await p.$disconnect();
}
