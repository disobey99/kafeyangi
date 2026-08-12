import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff, requireCafeManager } from "@/lib/cafe-access";
import { publishCafeEvent } from "@/lib/realtime";

const audienceSchema = z.enum(["STAFF", "CUSTOMER"]);

type NoticeRow = {
  id: string;
  cafeId: string;
  title: string;
  body: string;
  priority: string;
  audience: string;
  createdBy: string | null;
  createdAt: string | Date;
};

function mapNotice(n: NoticeRow) {
  return {
    id: n.id,
    cafeId: n.cafeId,
    title: n.title,
    body: n.body,
    priority: n.priority,
    audience: n.audience ?? "CUSTOMER",
    createdBy: n.createdBy,
    createdAt: n.createdAt,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  const { searchParams } = new URL(request.url);
  const audienceRaw = searchParams.get("audience");
  const audience =
    audienceRaw === "STAFF" || audienceRaw === "CUSTOMER" ? audienceRaw : null;

  const notices = audience
    ? await prisma.$queryRaw<NoticeRow[]>`
        SELECT id, cafeId, title, body, priority, audience, createdBy, createdAt
        FROM Notice
        WHERE cafeId = ${cafeId} AND audience = ${audience}
        ORDER BY createdAt DESC
        LIMIT 30
      `
    : await prisma.$queryRaw<NoticeRow[]>`
        SELECT id, cafeId, title, body, priority, audience, createdBy, createdAt
        FROM Notice
        WHERE cafeId = ${cafeId}
        ORDER BY createdAt DESC
        LIMIT 30
      `;

  return NextResponse.json({ notices: notices.map(mapNotice) });
}

const schema = z.object({
  title: z.string().min(2).max(120),
  body: z.string().min(2).max(2000),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
  audience: audienceSchema.default("CUSTOMER"),
});

const patchSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2).max(120).optional(),
  body: z.string().min(2).max(2000).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).optional(),
  audience: audienceSchema.optional(),
});

function cuidLike() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const input = schema.parse(await request.json());
  const id = cuidLike();
  const createdBy = access.session.userId;

  await prisma.$executeRaw`
    INSERT INTO Notice (id, cafeId, title, body, priority, audience, createdBy, createdAt)
    VALUES (
      ${id},
      ${cafeId},
      ${input.title},
      ${input.body},
      ${input.priority},
      ${input.audience},
      ${createdBy},
      CURRENT_TIMESTAMP
    )
  `;

  const rows = await prisma.$queryRaw<NoticeRow[]>`
    SELECT id, cafeId, title, body, priority, audience, createdBy, createdAt
    FROM Notice WHERE id = ${id} LIMIT 1
  `;
  const notice = mapNotice(rows[0]!);
  publishCafeEvent(cafeId, { type: "ops.notice.created", payload: { notice } });
  return NextResponse.json({ notice });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeManager(cafeId);
    if (!access.ok) return access.response;

    const input = patchSchema.parse(await request.json());
    const existing = await prisma.$queryRaw<NoticeRow[]>`
      SELECT id, cafeId, title, body, priority, audience, createdBy, createdAt
      FROM Notice WHERE id = ${input.id} AND cafeId = ${cafeId} LIMIT 1
    `;
    if (!existing[0]) {
      return NextResponse.json({ error: "E'lon topilmadi" }, { status: 404 });
    }

    const next = {
      title: input.title ?? existing[0].title,
      body: input.body ?? existing[0].body,
      priority: input.priority ?? existing[0].priority,
      audience: input.audience ?? existing[0].audience ?? "CUSTOMER",
    };

    await prisma.$executeRaw`
      UPDATE Notice
      SET title = ${next.title},
          body = ${next.body},
          priority = ${next.priority},
          audience = ${next.audience}
      WHERE id = ${input.id} AND cafeId = ${cafeId}
    `;

    const rows = await prisma.$queryRaw<NoticeRow[]>`
      SELECT id, cafeId, title, body, priority, audience, createdBy, createdAt
      FROM Notice WHERE id = ${input.id} LIMIT 1
    `;
    const notice = mapNotice(rows[0]!);
    publishCafeEvent(cafeId, { type: "ops.notice.updated", payload: { notice } });
    return NextResponse.json({ notice });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumot noto'g'ri" }, { status: 400 });
    }
    return NextResponse.json({ error: "E'lonni yangilab bo'lmadi" }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID kiritilmagan" }, { status: 400 });
  }

  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM Notice WHERE id = ${id} AND cafeId = ${cafeId} LIMIT 1
  `;
  if (!existing[0]) {
    return NextResponse.json({ error: "E'lon topilmadi" }, { status: 404 });
  }

  await prisma.$executeRaw`
    DELETE FROM Notice WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true });
}
