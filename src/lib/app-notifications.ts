import { prisma } from "@/lib/prisma";
import { getReports } from "@/lib/reports";
import { getCafeStaffRatingMap } from "@/lib/staff-ratings";
import { publishCafeEvent, publishPlatformEvent } from "@/lib/realtime";

export type NotificationKind = "INSIGHT" | "PRAISE" | "COMFORT" | "SYSTEM" | "SUPPORT";

export type AppNotificationRow = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  cafeId: string | null;
  cafeName: string | null;
  readAt: string | null;
  createdAt: string;
};

const UZ_DAYS = [
  "Yakshanba",
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
];

function todayKey() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function dayStartIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function hasTodayNotifications(userId: string, cafeId?: string | null) {
  const rows = await prisma.$queryRaw<Array<{ c: number | bigint }>>`
    SELECT COUNT(*) AS c FROM AppNotification
    WHERE userId = ${userId}
      AND (${cafeId ?? null} IS NULL OR cafeId = ${cafeId ?? null})
      AND datetime(createdAt) >= datetime(${dayStartIso()})
  `;
  return Number(rows[0]?.c ?? 0) > 0;
}

async function insertNotification(input: {
  userId: string;
  cafeId?: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
}) {
  const id = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO AppNotification (id, userId, cafeId, kind, title, body, createdAt)
    VALUES (${id}, ${input.userId}, ${input.cafeId ?? null}, ${input.kind}, ${input.title}, ${input.body}, CURRENT_TIMESTAMP)
  `;
}

function formatUzDate(d = new Date()) {
  return d.toLocaleDateString("uz-UZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function peakHoursText(hourly: Array<{ hour: number; count: number }>) {
  const sorted = [...hourly].sort((a, b) => b.count - a.count);
  const top = sorted.filter((h) => h.count > 0).slice(0, 3);
  if (top.length === 0) return "hozircha aniq vaqt yo'q";
  return top.map((h) => `${String(h.hour).padStart(2, "0")}:00`).join(", ");
}

async function weekdayInsightText(cafeId: string, todayDow: number) {
  const rows = await prisma.$queryRaw<
    Array<{ dow: string; orders: number | bigint; revenue: number | bigint }>
  >`
    SELECT CAST(strftime('%w', createdAt) AS INTEGER) AS dow,
           COUNT(*) AS orders,
           COALESCE(SUM(totalAmount), 0) AS revenue
    FROM "Order"
    WHERE cafeId = ${cafeId}
      AND status = 'DELIVERED'
      AND datetime(createdAt) >= datetime('now', '-28 days')
    GROUP BY dow
  `;

  if (rows.length === 0) return "";

  const byDow = new Map(rows.map((r) => [Number(r.dow), Number(r.orders)]));
  const todayAvg = byDow.get(todayDow) ?? 0;
  const sorted = [...byDow.entries()].sort((a, b) => b[1] - a[1]);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const parts: string[] = [];
  if (best && best[0] === todayDow) {
    parts.push(`Bugun (${UZ_DAYS[todayDow]}) tarixiy eng faol kunlardan biri`);
  } else if (best) {
    parts.push(`Eng kuchli kun odatda ${UZ_DAYS[best[0]]} (${best[1]} buyurtma/4 hafta)`);
  }
  if (worst && worst[1] < todayAvg * 0.6) {
    parts.push(`${UZ_DAYS[worst[0]]} tinchroq — xodimlarni rejalashtiring`);
  }
  return parts.join(". ");
}

async function generateCafeNotifications(userId: string, cafeId: string, cafeName: string) {
  if (await hasTodayNotifications(userId, cafeId)) return;

  const reports = await getReports(cafeId, "week");
  const dayReports = await getReports(cafeId, "day");
  const dayName = UZ_DAYS[new Date().getDay()];
  const todayDow = new Date().getDay();
  const dateLabel = formatUzDate();
  const peak = peakHoursText(reports.hourly ?? []);
  const weekdayTip = await weekdayInsightText(cafeId, todayDow);
  const todayOrders = dayReports.summary.orderCount;
  const avgCheck = dayReports.summary.avgCheck;

  await insertNotification({
    userId,
    cafeId,
    kind: "INSIGHT",
    title: `${dayName} — jonli tahlil`,
    body: `📅 ${dateLabel}. Kuchli soatlar: ${peak}. O'rtacha chek ${Math.round(avgCheck / 100).toLocaleString("uz-UZ")} so'm.${weekdayTip ? ` ${weekdayTip}.` : ""} Bugun ${todayOrders} ta buyurtma.`,
  });

  const staffRows = await prisma.$queryRaw<
    Array<{ userId: string; name: string; orders: number | bigint }>
  >`
    SELECT u.id AS userId, u.name,
      (SELECT COUNT(*) FROM "Order" o
       WHERE o.cafeId = ${cafeId} AND o.createdById = u.id
       AND o.status = 'DELIVERED'
       AND datetime(o.createdAt) >= datetime(${dayStartIso()})) AS orders
    FROM CafeMember cm
    JOIN User u ON u.id = cm.userId
    WHERE cm.cafeId = ${cafeId} AND cm.isActive = 1
      AND cm.role IN ('WAITER', 'CASHIER')
  `;

  const topStaff = staffRows
    .map((s) => ({ ...s, orders: Number(s.orders) }))
    .sort((a, b) => b.orders - a.orders)[0];

  if (topStaff && topStaff.orders >= 5) {
    const ratings = await getCafeStaffRatingMap(cafeId);
    const staffRating = ratings[topStaff.userId];
    const ratingText =
      staffRating && staffRating.count > 0
        ? ` Mijoz reytingi: ${staffRating.avgScore.toFixed(1)}★ (${staffRating.count})`
        : "";
    await insertNotification({
      userId,
      cafeId,
      kind: "PRAISE",
      title: `Ajoyib jamoa! · ${dateLabel}`,
      body: `${topStaff.name} bugun ${topStaff.orders} ta buyurtma qabul qildi.${ratingText} ${cafeName} jamoasi yaxshi ishlayapti!`,
    });
  } else if (todayOrders <= 3) {
    await insertNotification({
      userId,
      cafeId,
      kind: "COMFORT",
      title: `Tinch kun · ${dateLabel}`,
      body: `Savdo hozircha past. ${weekdayTip || "Menyu va xizmat sifatini tekshiring."} Ertaga yaxshilanishi mumkin — ${peak} soatlarida tayyor turing.`,
    });
  } else {
    await insertNotification({
      userId,
      cafeId,
      kind: "SYSTEM",
      title: `Kunlik holat · ${dateLabel}`,
      body: `Bugun ${todayOrders} ta buyurtma. Eng faol vaqt: ${peak}.${weekdayTip ? ` ${weekdayTip}.` : ""}`,
    });
  }
}

async function isPlatformUser(userId: string) {
  const rows = await prisma.$queryRaw<Array<{ globalRole: string }>>`
    SELECT globalRole FROM User WHERE id = ${userId} LIMIT 1
  `;
  const role = rows[0]?.globalRole;
  return role === "SUPER_ADMIN" || role === "PLATFORM_STAFF";
}

/** Super admin / platforma xodimiga kafe kunlik tahlillari kelmasin */
async function purgeCafeDailyNotifications(userId: string) {
  await prisma.$executeRaw`
    DELETE FROM AppNotification
    WHERE userId = ${userId}
      AND kind IN ('INSIGHT', 'PRAISE', 'COMFORT', 'SYSTEM')
  `;
}

export async function ensureDailyNotifications(userId: string, cafeId?: string) {
  // Platforma admin / staff — kafe jonli tahlil xabarlari yo'q
  if (await isPlatformUser(userId)) {
    await purgeCafeDailyNotifications(userId);
    return;
  }
  if (!cafeId) return;
  if (await hasTodayNotifications(userId, cafeId)) return;

  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    select: { name: true },
  });
  if (cafe) await generateCafeNotifications(userId, cafeId, cafe.name);
}

export async function listNotifications(
  userId: string,
  cafeId?: string,
): Promise<AppNotificationRow[]> {
  await ensureDailyNotifications(userId, cafeId);

  // Avval o'qilgan support xabarlari ro'yxatni to'ldirmasin
  await prisma.$executeRaw`
    DELETE FROM AppNotification
    WHERE userId = ${userId}
      AND kind = 'SUPPORT'
      AND readAt IS NOT NULL
  `;

  const platformUser = await isPlatformUser(userId);

  const rows = platformUser
    ? await prisma.$queryRaw<
        Array<{
          id: string;
          kind: string;
          title: string;
          body: string;
          cafeId: string | null;
          cafeName: string | null;
          readAt: string | null;
          createdAt: string;
        }>
      >`
        SELECT n.id, n.kind, n.title, n.body, n.cafeId, n.readAt, n.createdAt,
               c.name AS cafeName
        FROM AppNotification n
        LEFT JOIN Cafe c ON c.id = n.cafeId
        WHERE n.userId = ${userId} AND n.kind = 'SUPPORT'
        ORDER BY n.createdAt DESC
        LIMIT 30
      `
    : await prisma.$queryRaw<
        Array<{
          id: string;
          kind: string;
          title: string;
          body: string;
          cafeId: string | null;
          cafeName: string | null;
          readAt: string | null;
          createdAt: string;
        }>
      >`
        SELECT n.id, n.kind, n.title, n.body, n.cafeId, n.readAt, n.createdAt,
               c.name AS cafeName
        FROM AppNotification n
        LEFT JOIN Cafe c ON c.id = n.cafeId
        WHERE n.userId = ${userId}
          AND (
            (${cafeId ?? null} IS NOT NULL AND (n.cafeId = ${cafeId ?? null} OR n.cafeId IS NULL))
            OR (${cafeId ?? null} IS NULL AND n.cafeId IS NOT NULL)
          )
        ORDER BY n.createdAt DESC
        LIMIT 30
      `;

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as NotificationKind,
    title: r.title,
    body: r.body,
    cafeId: r.cafeId,
    cafeName: r.cafeName,
    readAt: r.readAt ? new Date(r.readAt).toISOString() : null,
    createdAt: new Date(r.createdAt).toISOString(),
  }));
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  if (ids?.length) {
    for (const id of ids) {
      await prisma.$executeRaw`
        UPDATE AppNotification SET readAt = CURRENT_TIMESTAMP
        WHERE id = ${id} AND userId = ${userId} AND readAt IS NULL AND kind != 'SUPPORT'
      `;
    }
    return;
  }
  // SUPPORT faqat chat ochilganda o'chadi — qo'ng'iroqchani ochish bilan "o'qilgan" bo'lmasin
  await prisma.$executeRaw`
    UPDATE AppNotification SET readAt = CURRENT_TIMESTAMP
    WHERE userId = ${userId} AND readAt IS NULL AND kind != 'SUPPORT'
  `;
}

export async function unreadNotificationCount(userId: string, cafeId?: string) {
  if (await isPlatformUser(userId)) {
    const rows = await prisma.$queryRaw<Array<{ c: number | bigint }>>`
      SELECT COUNT(*) AS c FROM AppNotification
      WHERE userId = ${userId} AND readAt IS NULL AND kind = 'SUPPORT'
    `;
    return Number(rows[0]?.c ?? 0);
  }

  const rows = await prisma.$queryRaw<Array<{ c: number | bigint }>>`
    SELECT COUNT(*) AS c FROM AppNotification
    WHERE userId = ${userId} AND readAt IS NULL
      AND (
        (${cafeId ?? null} IS NOT NULL AND (cafeId = ${cafeId ?? null} OR cafeId IS NULL))
        OR (${cafeId ?? null} IS NULL AND cafeId IS NOT NULL)
      )
  `;
  return Number(rows[0]?.c ?? 0);
}

async function getCafeManagerUserIds(cafeId: string) {
  const rows = await prisma.$queryRaw<Array<{ userId: string }>>`
    SELECT ownerId AS userId FROM Cafe WHERE id = ${cafeId}
    UNION
    SELECT userId FROM CafeMember
    WHERE cafeId = ${cafeId} AND isActive = 1 AND role IN ('OWNER', 'MANAGER')
  `;
  return [...new Set(rows.map((r) => r.userId))];
}

async function getPlatformSupportRecipientIds() {
  const rows = await prisma.$queryRaw<Array<{ userId: string }>>`
    SELECT id AS userId FROM User WHERE globalRole = 'SUPER_ADMIN'
    UNION
    SELECT userId FROM PlatformStaff
    WHERE isActive = 1 AND role IN ('ADMIN', 'SUPPORT')
  `;
  return [...new Set(rows.map((r) => r.userId))];
}

function messagePreview(text: string) {
  const trimmed = text.trim();
  if (trimmed.length <= 120) return trimmed;
  return `${trimmed.slice(0, 117)}...`;
}

export async function notifySupportMessage(input: {
  cafeId: string;
  cafeName: string;
  senderType: "CAFE" | "PLATFORM";
  senderUserId: string;
  senderName: string;
  text: string;
}) {
  const preview = messagePreview(input.text);
  if (!preview) return;

  if (input.senderType === "PLATFORM") {
    const recipients = await getCafeManagerUserIds(input.cafeId);
    for (const userId of recipients) {
      if (userId === input.senderUserId) continue;
      await insertNotification({
        userId,
        cafeId: input.cafeId,
        kind: "SUPPORT",
        title: "Qo'llab-quvvatlashdan xabar",
        body: `${input.senderName}: ${preview}`,
      });
    }
    publishCafeEvent(input.cafeId, { type: "support.message" });
    return;
  }

  const recipients = await getPlatformSupportRecipientIds();
  for (const userId of recipients) {
    if (userId === input.senderUserId) continue;
    await insertNotification({
      userId,
      cafeId: input.cafeId,
      kind: "SUPPORT",
      title: `${input.cafeName} — yangi xabar`,
      body: `${input.senderName}: ${preview}`,
    });
  }
  publishPlatformEvent({ type: "support.message", payload: { cafeId: input.cafeId } });
  publishCafeEvent(input.cafeId, { type: "support.message" });
}

/** Chat ochilganda support xabarlari qo'ng'iroqchadan butunlay olib tashlanadi */
export async function markSupportNotificationsRead(userId: string, cafeId: string) {
  await prisma.$executeRaw`
    DELETE FROM AppNotification
    WHERE userId = ${userId}
      AND cafeId = ${cafeId}
      AND kind = 'SUPPORT'
  `;
}
