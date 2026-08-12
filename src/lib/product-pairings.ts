import { prisma } from "@/lib/prisma";

export type ProductPairingSuggestion = {
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  reason: string;
};

const KEYWORD_RULES: Array<{ match: RegExp; suggest: RegExp; reason: string }> = [
  { match: /osh|plov|palov/i, suggest: /salat|sabzavot|achichuk/i, reason: "Osh bilan yaxshi ketadi" },
  { match: /osh|plov|palov/i, suggest: /choy|kompot|ayran/i, reason: "Issiq taomdan keyin ichimlik" },
  { match: /shirin|tort|desert|pishiriq|kek|muss/i, suggest: /choy|kofe|latte|kakao/i, reason: "Shirinlikka ichimlik mos" },
  { match: /burger|lavash|shaurma|hot.?dog/i, suggest: /fri|kartoshka|cola|pepsi|ichimlik/i, reason: "Fast-food uchun qo'shimcha" },
  { match: /steak|go'sht|kabob|shashlik/i, suggest: /salat|sous|ichimlik/i, reason: "Go'shtli taomga yonida" },
  { match: /sup|sho'rva|lagman/i, suggest: /non|lepeshka|choy/i, reason: "Issiq taom bilan non yoki choy" },
];

async function coOccurrencePairings(cafeId: string, productId: string, limit = 3) {
  const rows = await prisma.$queryRaw<
    Array<{ productId: string; name: string; price: number; imageUrl: string | null; cnt: number | bigint }>
  >`
    SELECT p.id AS productId, p.name, p.price, p.imageUrl, COUNT(*) AS cnt
    FROM OrderItem oi1
    JOIN "Order" o ON o.id = oi1.orderId
    JOIN OrderItem oi2 ON oi2.orderId = o.id AND oi2.productId != oi1.productId
    JOIN Product p ON p.id = oi2.productId
    WHERE o.cafeId = ${cafeId}
      AND oi1.productId = ${productId}
      AND o.status = 'DELIVERED'
      AND p.isAvailable = 1
    GROUP BY p.id
    ORDER BY cnt DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    productId: r.productId,
    name: r.name,
    price: r.price,
    imageUrl: r.imageUrl,
    reason: "Ko'p mijozlar birga buyurtma qiladi",
  }));
}

async function ruleBasedPairings(
  cafeId: string,
  anchorName: string,
  excludeIds: string[],
  limit = 2,
) {
  const rule = KEYWORD_RULES.find((r) => r.match.test(anchorName));
  if (!rule) return [];

  const products = await prisma.product.findMany({
    where: { cafeId, isAvailable: true, id: { notIn: excludeIds } },
    select: { id: true, name: true, price: true, imageUrl: true },
    take: 80,
  });

  const matched = products.filter((p) => rule.suggest.test(p.name)).slice(0, limit);
  return matched.map((p) => ({
    productId: p.id,
    name: p.name,
    price: p.price,
    imageUrl: p.imageUrl,
    reason: rule.reason,
  }));
}

export async function getProductPairings(
  cafeId: string,
  productId: string,
  limit = 2,
): Promise<ProductPairingSuggestion[]> {
  const anchor = await prisma.product.findFirst({
    where: { id: productId, cafeId },
    select: { id: true, name: true },
  });
  if (!anchor) return [];

  const fromHistory = await coOccurrencePairings(cafeId, productId, limit);
  if (fromHistory.length >= limit) return fromHistory.slice(0, limit);

  const exclude = [productId, ...fromHistory.map((p) => p.productId)];
  const fromRules = await ruleBasedPairings(
    cafeId,
    anchor.name,
    exclude,
    limit - fromHistory.length,
  );

  return [...fromHistory, ...fromRules].slice(0, limit);
}
