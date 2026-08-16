import { prisma } from "@/lib/prisma";
import { formatDailyReportMessage } from "@/lib/daily-report";
import { getReports } from "@/lib/reports";
import { publishCafeEvent } from "@/lib/realtime";

export type OwnerCafe = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
  groupId: string | null;
  isMainBranch: boolean;
};

export async function listOwnerCafes(ownerId: string): Promise<OwnerCafe[]> {
  const rows = await prisma.cafe.findMany({
    where: { ownerId },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      status: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
      groupId: true,
      isMainBranch: true,
    },
    orderBy: [{ isMainBranch: "desc" }, { createdAt: "asc" }],
  });
  return rows;
}

export async function formatTodaySalesMessage(cafe: OwnerCafe): Promise<string> {
  try {
    const report = await getReports(cafe.id, "day");
    return formatDailyReportMessage(cafe.name, report);
  } catch (e) {
    console.error("[formatTodaySalesMessage]", e);
    return "⚠️ Bugungi savdo hisoboti olinmadi. Keyinroq urinib ko‘ring.";
  }
}

/** Bugun faol / hozir online xodimlar */
export async function formatStaffDutyMessage(cafe: OwnerCafe): Promise<string> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const members = await prisma.cafeMember.findMany({
    where: {
      cafeId: cafe.id,
      isActive: true,
      lastActiveAt: { gte: start },
    },
    select: {
      role: true,
      lastActiveAt: true,
      user: { select: { name: true } },
    },
    orderBy: { lastActiveAt: "desc" },
  });

  const online = members.filter(
    (m) => m.lastActiveAt && m.lastActiveAt >= fiveMinutesAgo,
  );

  const lines = [
    `👥 <b>Xodimlar — ${cafe.name}</b>`,
    "",
    `🟢 Hozir online: <b>${online.length}</b>`,
    `📅 Bugun tizimda bo‘lgan: <b>${members.length}</b>`,
  ];

  if (online.length > 0) {
    lines.push("", "<b>Online:</b>");
    for (const m of online.slice(0, 15)) {
      lines.push(`• ${m.user.name} (${m.role})`);
    }
  } else if (members.length > 0) {
    lines.push("", "<b>Bugun faol bo‘lganlar:</b>");
    for (const m of members.slice(0, 15)) {
      const t = m.lastActiveAt
        ? m.lastActiveAt.toLocaleTimeString("uz-UZ", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";
      lines.push(`• ${m.user.name} (${m.role}) — ${t}`);
    }
  } else {
    lines.push("", "Bugun hali hech kim tizimga kirmagan.");
  }

  return lines.join("\n");
}

export function parseReportDateRange(
  text: string,
): { from: string; to: string } | { error: string } {
  const cleaned = text.trim().replace(/\s+/g, " ");
  const m =
    cleaned.match(/^(\d{4}-\d{2}-\d{2})\s*[-–—]\s*(\d{4}-\d{2}-\d{2})$/) ||
    cleaned.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2}-\d{2})$/);
  if (!m) {
    return {
      error:
        "Format: <code>YYYY-MM-DD YYYY-MM-DD</code>\nMasalan: <code>2026-07-01 2026-07-23</code>",
    };
  }
  return { from: m[1]!, to: m[2]! };
}

export async function formatCustomReportMessage(
  cafe: OwnerCafe,
  from: string,
  to: string,
): Promise<string> {
  try {
    const report = await getReports(cafe.id, { period: "custom", from, to });
    return formatDailyReportMessage(cafe.name, report);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hisobot olinmadi";
    return `⚠️ ${msg}`;
  }
}

export function formatBranchesMessage(cafes: OwnerCafe[], activeCafeId: string): string {
  if (cafes.length <= 1) {
    return cafes[0]
      ? `🏪 Filial yo‘q — bitta nuqta: <b>${cafes[0].name}</b>`
      : "Kafe topilmadi.";
  }
  const lines = ["🏪 <b>Filiallar</b>", "Tanlash uchun tugmani bosing:", ""];
  for (const c of cafes) {
    const mark = c.id === activeCafeId ? "✅" : "▫️";
    const branch = c.isMainBranch ? " (asosiy)" : "";
    lines.push(`${mark} ${c.name}${branch}`);
  }
  return lines.join("\n");
}

export async function formatStaffChatPreview(cafeId: string): Promise<string> {
  const rows = await prisma.chatMessage.findMany({
    where: { cafeId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      senderName: true,
      text: true,
      createdAt: true,
    },
  });
  const messages = rows.reverse();
  if (messages.length === 0) {
    return "💬 Xodimlar chatida hali xabar yo‘q.\nYozing — xabar ichki chatga tushadi (platforma Support emas).";
  }
  const lines = ["💬 <b>So‘nggi xabarlar</b> (ichki chat):", ""];
  for (const m of messages) {
    const t = m.createdAt.toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const body = m.text.length > 120 ? `${m.text.slice(0, 117)}…` : m.text;
    lines.push(`<b>${m.senderName}</b> · ${t}\n${escapeHtml(body)}`);
  }
  lines.push("", "Xabar yozing. Chiqish: /menu");
  return lines.join("\n");
}

export async function postOwnerStaffChatMessage(opts: {
  cafeId: string;
  userId: string;
  userName: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const body = opts.text.trim().slice(0, 1000);
  if (!body) return { ok: false, error: "Bo‘sh xabar" };

  const created = await prisma.chatMessage.create({
    data: {
      cafeId: opts.cafeId,
      senderId: opts.userId,
      senderName: `${opts.userName} (Telegram)`,
      text: body,
      reads: {
        create: {
          userId: opts.userId,
          userName: opts.userName,
        },
      },
    },
  });

  publishCafeEvent(opts.cafeId, {
    type: "ops.chat.created",
    payload: {
      message: {
        id: created.id,
        cafeId: created.cafeId,
        senderId: created.senderId,
        senderName: created.senderName,
        text: created.text,
        replyToId: null,
        createdAt: created.createdAt,
        replyTo: null,
        reads: [
          { userId: opts.userId, userName: opts.userName, readAt: created.createdAt },
        ],
        readCount: 1,
      },
    },
  });

  return { ok: true };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
