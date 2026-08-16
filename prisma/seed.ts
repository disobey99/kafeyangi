import { PrismaClient, GlobalRole, CafeRole, CafeStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@kafe.uz" },
    update: {
      passwordHash,
      globalRole: GlobalRole.SUPER_ADMIN,
      name: "Platform Admin",
    },
    create: {
      email: "admin@kafe.uz",
      passwordHash,
      name: "Platform Admin",
      globalRole: GlobalRole.SUPER_ADMIN,
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "egasi@demo.uz" },
    update: {},
    create: {
      email: "egasi@demo.uz",
      passwordHash,
      name: "Demo Kafe Egasi",
      phone: "+998901234567",
      globalRole: GlobalRole.USER,
    },
  });

  const cafe = await prisma.cafe.upsert({
    where: { slug: "demo-kafe" },
    update: {
      plan: "STANDARD",
      status: CafeStatus.TRIAL,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      waiterServiceFeePercent: 10,
    },
    create: {
      name: "Demo Kafe",
      slug: "demo-kafe",
      address: "Toshkent, Chilonzor",
      phone: "+998901234567",
      status: CafeStatus.TRIAL,
      plan: "STANDARD",
      ownerId: owner.id,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.cafeMember.upsert({
    where: { cafeId_userId: { cafeId: cafe.id, userId: owner.id } },
    update: {},
    create: {
      cafeId: cafe.id,
      userId: owner.id,
      role: CafeRole.OWNER,
    },
  });

  const category = await prisma.category.upsert({
    where: { id: "seed-cat-1" },
    update: {
      nameRu: "Основные блюда",
      nameEn: "Main dishes",
    },
    create: {
      id: "seed-cat-1",
      cafeId: cafe.id,
      name: "Asosiy taomlar",
      nameRu: "Основные блюда",
      nameEn: "Main dishes",
      sortOrder: 1,
    },
  });

  const products = [
    {
      name: "Osh",
      nameRu: "Плов",
      nameEn: "Plov",
      price: 3500000,
      description: "An'anaviy o'zbek oshi",
      descriptionRu: "Традиционный узбекский плов",
      descriptionEn: "Traditional Uzbek plov",
    },
    {
      name: "Lag'mon",
      nameRu: "Лагман",
      nameEn: "Lagman",
      price: 2800000,
      description: "Uy lag'moni",
      descriptionRu: "Домашний лагман",
      descriptionEn: "Homemade lagman",
    },
    {
      name: "Choy",
      nameRu: "Чай",
      nameEn: "Tea",
      price: 500000,
      description: "Ko'k choy",
      descriptionRu: "Зелёный чай",
      descriptionEn: "Green tea",
    },
    {
      name: "Salat",
      nameRu: "Салат",
      nameEn: "Salad",
      price: 1500000,
      description: "Achchiq-sabzavotli",
      descriptionRu: "Острый овощной",
      descriptionEn: "Spicy vegetable salad",
    },
  ];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    await prisma.product.upsert({
      where: { id: `seed-prod-${i + 1}` },
      update: {
        nameRu: p.nameRu,
        nameEn: p.nameEn,
        descriptionRu: p.descriptionRu,
        descriptionEn: p.descriptionEn,
      },
      create: {
        id: `seed-prod-${i + 1}`,
        cafeId: cafe.id,
        categoryId: category.id,
        name: p.name,
        nameRu: p.nameRu,
        nameEn: p.nameEn,
        description: p.description,
        descriptionRu: p.descriptionRu,
        descriptionEn: p.descriptionEn,
        price: p.price,
        sortOrder: i + 1,
      },
    });
  }

  for (let n = 1; n <= 5; n++) {
    await prisma.table.upsert({
      where: { cafeId_number: { cafeId: cafe.id, number: n } },
      update: {},
      create: {
        cafeId: cafe.id,
        number: n,
        name: `Stol ${n}`,
      },
    });
  }

  const waiter = await prisma.user.upsert({
    where: { email: "ofitsiant@demo.uz" },
    update: {},
    create: {
      email: "ofitsiant@demo.uz",
      passwordHash,
      name: "Demo Ofitsiant",
      phone: "+998901234568",
      globalRole: GlobalRole.USER,
    },
  });

  await prisma.cafeMember.upsert({
    where: { cafeId_userId: { cafeId: cafe.id, userId: waiter.id } },
    update: { role: CafeRole.WAITER, isActive: true },
    create: {
      cafeId: cafe.id,
      userId: waiter.id,
      role: CafeRole.WAITER,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: "kassir@demo.uz" },
    update: {},
    create: {
      email: "kassir@demo.uz",
      passwordHash,
      name: "Demo Kassir",
      phone: "+998901234569",
      globalRole: GlobalRole.USER,
    },
  });

  await prisma.cafeMember.upsert({
    where: { cafeId_userId: { cafeId: cafe.id, userId: cashier.id } },
    update: { role: CafeRole.CASHIER, isActive: true },
    create: {
      cafeId: cafe.id,
      userId: cashier.id,
      role: CafeRole.CASHIER,
    },
  });

  console.log("Seed muvaffaqiyatli!");
  console.log("");
  console.log("Platform admin: admin@kafe.uz / admin123");
  console.log("Kafe egasi:     egasi@demo.uz / admin123");
  console.log("Ofitsiant:      ofitsiant@demo.uz / admin123");
  console.log("Kassir:         kassir@demo.uz / admin123");
  console.log("Demo kafe slug: demo-kafe");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
