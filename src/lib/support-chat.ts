import { prisma } from "@/lib/prisma";
import { notifySupportMessage } from "@/lib/app-notifications";

export type SupportSenderType = "CAFE" | "PLATFORM";

export type SupportMessageRow = {
  id: string;
  conversationId: string;
  cafeId: string;
  senderType: SupportSenderType;
  senderUserId: string;
  senderName: string;
  text: string;
  readAt: string | null;
  createdAt: string;
};

export async function getOrCreateOpenConversation(cafeId: string) {
  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM SupportConversation
    WHERE cafeId = ${cafeId} AND status = 'OPEN'
    ORDER BY updatedAt DESC
    LIMIT 1
  `;
  if (existing[0]) return existing[0].id;

  const id = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO SupportConversation (id, cafeId, status, createdAt, updatedAt)
    VALUES (${id}, ${cafeId}, 'OPEN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  return id;
}

export async function listSupportMessages(conversationId: string, limit = 100) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      conversationId: string;
      cafeId: string;
      senderType: string;
      senderUserId: string;
      senderName: string;
      text: string;
      readAt: string | null;
      createdAt: string;
    }>
  >`
    SELECT id, conversationId, cafeId, senderType, senderUserId, senderName, text, readAt, createdAt
    FROM SupportMessage
    WHERE conversationId = ${conversationId}
    ORDER BY createdAt ASC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    ...r,
    senderType: r.senderType as SupportSenderType,
    readAt: r.readAt ? new Date(r.readAt).toISOString() : null,
    createdAt: new Date(r.createdAt).toISOString(),
  }));
}

export async function createSupportMessage(input: {
  conversationId: string;
  cafeId: string;
  senderType: SupportSenderType;
  senderUserId: string;
  senderName: string;
  text: string;
}) {
  const id = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO SupportMessage (id, conversationId, cafeId, senderType, senderUserId, senderName, text, createdAt)
    VALUES (
      ${id},
      ${input.conversationId},
      ${input.cafeId},
      ${input.senderType},
      ${input.senderUserId},
      ${input.senderName},
      ${input.text},
      CURRENT_TIMESTAMP
    )
  `;
  await prisma.$executeRaw`
    UPDATE SupportConversation SET updatedAt = CURRENT_TIMESTAMP WHERE id = ${input.conversationId}
  `;
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      conversationId: string;
      cafeId: string;
      senderType: string;
      senderUserId: string;
      senderName: string;
      text: string;
      readAt: string | null;
      createdAt: string;
    }>
  >`
    SELECT id, conversationId, cafeId, senderType, senderUserId, senderName, text, readAt, createdAt
    FROM SupportMessage WHERE id = ${id}
  `;
  const r = rows[0];
  const message = {
    ...r,
    senderType: r.senderType as SupportSenderType,
    readAt: null,
    createdAt: new Date(r.createdAt).toISOString(),
  } satisfies SupportMessageRow;

  const cafe = await prisma.cafe.findUnique({
    where: { id: input.cafeId },
    select: { name: true },
  });
  if (cafe) {
    await notifySupportMessage({
      cafeId: input.cafeId,
      cafeName: cafe.name,
      senderType: input.senderType,
      senderUserId: input.senderUserId,
      senderName: input.senderName,
      text: input.text,
    });
  }

  return message;
}

/** Kafe xodimi platforma xabarlarini o'qiganda — faqat PLATFORM xabarlariga readAt */
export async function markSupportReadByCafe(conversationId: string) {
  await prisma.$executeRaw`
    UPDATE SupportMessage
    SET readAt = CURRENT_TIMESTAMP
    WHERE conversationId = ${conversationId}
      AND senderType = 'PLATFORM'
      AND readAt IS NULL
  `;
}

export async function getPlatformSupportUnreadTotal(): Promise<number> {
  const rows = await listPlatformSupportInbox();
  return rows.reduce((sum, row) => sum + Number(row.unreadCount ?? 0), 0);
}

export async function listPlatformSupportInbox() {
  return prisma.$queryRaw<
    Array<{
      cafeId: string;
      cafeName: string;
      conversationId: string;
      lastMessage: string;
      lastAt: string;
      unreadCount: number | bigint;
    }>
  >`
    SELECT
      c.id AS cafeId,
      c.name AS cafeName,
      sc.id AS conversationId,
      (
        SELECT sm.text FROM SupportMessage sm
        WHERE sm.conversationId = sc.id
        ORDER BY sm.createdAt DESC LIMIT 1
      ) AS lastMessage,
      sc.updatedAt AS lastAt,
      (
        SELECT COUNT(*) FROM SupportMessage sm
        WHERE sm.conversationId = sc.id
          AND sm.senderType = 'CAFE'
          AND sm.createdAt > COALESCE(
            (SELECT MAX(sm2.createdAt) FROM SupportMessage sm2
             WHERE sm2.conversationId = sc.id AND sm2.senderType = 'PLATFORM'),
            '1970-01-01'
          )
      ) AS unreadCount
    FROM SupportConversation sc
    JOIN Cafe c ON c.id = sc.cafeId
    WHERE sc.status = 'OPEN'
    ORDER BY sc.updatedAt DESC
  `;
}

export function mapMessageForCafeView(message: SupportMessageRow) {
  return {
    id: message.id,
    senderType: message.senderType,
    senderName: message.senderName,
    text: message.text,
    createdAt: message.createdAt,
    receipt:
      message.senderType === "CAFE"
        ? ("sent" as const)
        : null,
  };
}

export function mapMessageForPlatformView(message: SupportMessageRow) {
  return {
    id: message.id,
    senderType: message.senderType,
    senderName: message.senderName,
    text: message.text,
    createdAt: message.createdAt,
    receipt:
      message.senderType === "PLATFORM"
        ? message.readAt
          ? ("read" as const)
          : ("sent" as const)
        : null,
  };
}
