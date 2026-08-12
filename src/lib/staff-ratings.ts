import { prisma } from "@/lib/prisma";

export type StaffRatingSummary = {
  avgScore: number;
  count: number;
};

export async function createStaffRating(input: {
  cafeId: string;
  memberUserId: string;
  tableId?: string;
  score: number;
  comment?: string;
}) {
  const id = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO StaffRating (id, cafeId, memberUserId, tableId, score, comment, createdAt)
    VALUES (
      ${id},
      ${input.cafeId},
      ${input.memberUserId},
      ${input.tableId ?? null},
      ${input.score},
      ${input.comment?.trim() || null},
      CURRENT_TIMESTAMP
    )
  `;
  return id;
}

export async function getStaffRatingSummary(
  cafeId: string,
  memberUserId: string,
): Promise<StaffRatingSummary> {
  const rows = await prisma.$queryRaw<Array<{ avgScore: number | null; count: number | bigint }>>`
    SELECT AVG(score) AS avgScore, COUNT(*) AS count
    FROM (
      SELECT score FROM StaffRating
      WHERE cafeId = ${cafeId} AND memberUserId = ${memberUserId}
      UNION ALL
      SELECT r.score AS score
      FROM OrderReview r
      INNER JOIN "Order" o ON o.id = r.orderId
      WHERE r.cafeId = ${cafeId}
        AND (
          (o.type = 'DELIVERY' AND o.assignedCourierId = ${memberUserId})
          OR (o.type != 'DELIVERY' AND o.createdById = ${memberUserId})
        )
    ) AS scores
  `;
  return {
    avgScore: Number(rows[0]?.avgScore ?? 0),
    count: Number(rows[0]?.count ?? 0),
  };
}

export async function getCafeStaffRatingMap(cafeId: string) {
  const rows = await prisma.$queryRaw<
    Array<{ memberUserId: string; avgScore: number | null; count: number | bigint }>
  >`
    SELECT memberUserId, AVG(score) AS avgScore, COUNT(*) AS count
    FROM (
      SELECT memberUserId, score FROM StaffRating
      WHERE cafeId = ${cafeId}
      UNION ALL
      SELECT
        CASE
          WHEN o.type = 'DELIVERY' AND o.assignedCourierId IS NOT NULL
            THEN o.assignedCourierId
          ELSE o.createdById
        END AS memberUserId,
        r.score AS score
      FROM OrderReview r
      INNER JOIN "Order" o ON o.id = r.orderId
      WHERE r.cafeId = ${cafeId}
        AND (
          (o.type = 'DELIVERY' AND o.assignedCourierId IS NOT NULL)
          OR (o.type != 'DELIVERY' AND o.createdById IS NOT NULL)
        )
    ) AS all_scores
    WHERE memberUserId IS NOT NULL
    GROUP BY memberUserId
  `;
  const map: Record<string, StaffRatingSummary> = {};
  for (const row of rows) {
    map[row.memberUserId] = {
      avgScore: Number(row.avgScore ?? 0),
      count: Number(row.count ?? 0),
    };
  }
  return map;
}

/** Stol / buyurtma reytinglari — tanlangan davr uchun */
export async function getCafeStaffRatingMapForPeriod(cafeId: string, since: Date) {
  const rows = await prisma.$queryRaw<
    Array<{ memberUserId: string; avgScore: number | null; count: number | bigint }>
  >`
    SELECT memberUserId, AVG(score) AS avgScore, COUNT(*) AS count
    FROM (
      SELECT memberUserId, score FROM StaffRating
      WHERE cafeId = ${cafeId} AND createdAt >= ${since}
      UNION ALL
      SELECT
        CASE
          WHEN o.type = 'DELIVERY' AND o.assignedCourierId IS NOT NULL
            THEN o.assignedCourierId
          ELSE o.createdById
        END AS memberUserId,
        r.score AS score
      FROM OrderReview r
      INNER JOIN "Order" o ON o.id = r.orderId
      WHERE r.cafeId = ${cafeId}
        AND r.createdAt >= ${since}
        AND (
          (o.type = 'DELIVERY' AND o.assignedCourierId IS NOT NULL)
          OR (o.type != 'DELIVERY' AND o.createdById IS NOT NULL)
        )
    ) AS all_scores
    WHERE memberUserId IS NOT NULL
    GROUP BY memberUserId
  `;
  const map: Record<string, StaffRatingSummary> = {};
  for (const row of rows) {
    map[row.memberUserId] = {
      avgScore: Number(row.avgScore ?? 0),
      count: Number(row.count ?? 0),
    };
  }
  return map;
}

export async function hasTableRating(tableId: string) {
  const rows = await prisma.$queryRaw<Array<{ c: number | bigint }>>`
    SELECT COUNT(*) AS c FROM StaffRating WHERE tableId = ${tableId}
  `;
  return Number(rows[0]?.c ?? 0) > 0;
}
