import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCafeStaff } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    update: {
      userId: access.session.userId,
      cafeId,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
    create: {
      userId: access.session.userId,
      cafeId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  let endpoint: string | undefined;
  try {
    const body = await request.json();
    endpoint = typeof body.endpoint === "string" ? body.endpoint : undefined;
  } catch {
    // ignore
  }

  if (endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: access.session.userId, cafeId },
    });
  } else {
    await prisma.pushSubscription.deleteMany({
      where: { userId: access.session.userId, cafeId },
    });
  }

  return NextResponse.json({ ok: true });
}
