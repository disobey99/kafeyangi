import { CafeRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff, requireCafeManager } from "@/lib/cafe-access";
import {
  buildEscPosFromPayload,
  type KitchenPrintPayload,
} from "@/lib/kitchen-print-jobs";

async function authorizePrintAgent(request: NextRequest, cafeId: string) {
  const token = request.headers.get("x-print-agent-token")?.trim();
  if (token) {
    const cafe = await prisma.cafe.findUnique({
      where: { id: cafeId },
      select: { printAgentToken: true },
    });
    if (cafe?.printAgentToken && cafe.printAgentToken === token) {
      return { ok: true as const };
    }
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Token noto'g'ri" }, { status: 401 }),
    };
  }

  const access = await requireCafeStaff(cafeId, [
    CafeRole.OWNER,
    CafeRole.MANAGER,
    CafeRole.CASHIER,
    CafeRole.KITCHEN,
  ]);
  if (!access.ok) return { ok: false as const, response: access.response };
  return { ok: true as const };
}

/** Navbatdagi cheklar (print-agent uchun) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const auth = await authorizePrintAgent(request, cafeId);
  if (!auth.ok) return auth.response;

  const limit = Math.min(
    20,
    Math.max(1, Number(request.nextUrl.searchParams.get("limit") || 5)),
  );

  const jobs = await prisma.kitchenPrintJob.findMany({
    where: { cafeId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return NextResponse.json({
    jobs: jobs.map((j) => {
      let payload: KitchenPrintPayload | null = null;
      try {
        payload = JSON.parse(j.payloadJson) as KitchenPrintPayload;
      } catch {
        payload = null;
      }
      return {
        id: j.id,
        orderId: j.orderId,
        prepStationId: j.prepStationId,
        createdAt: j.createdAt,
        payload,
        printerHost: payload?.printerHost ?? null,
      };
    }),
  });
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("claim"),
    jobId: z.string().min(1),
  }),
  z.object({
    action: z.literal("done"),
    jobId: z.string().min(1),
  }),
  z.object({
    action: z.literal("fail"),
    jobId: z.string().min(1),
    error: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("rotate-token"),
  }),
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }

  if (body.action === "rotate-token") {
    const access = await requireCafeManager(cafeId);
    if (!access.ok) return access.response;
    const token = randomBytes(24).toString("hex");
    await prisma.cafe.update({
      where: { id: cafeId },
      data: { printAgentToken: token },
    });
    return NextResponse.json({ printAgentToken: token });
  }

  const auth = await authorizePrintAgent(request, cafeId);
  if (!auth.ok) return auth.response;

  const job = await prisma.kitchenPrintJob.findFirst({
    where: { id: body.jobId, cafeId },
  });
  if (!job) {
    return NextResponse.json({ error: "Vazifa topilmadi" }, { status: 404 });
  }

  if (body.action === "claim") {
    if (job.status !== "PENDING" && job.status !== "PRINTING") {
      return NextResponse.json({ error: "Vazifa band emas" }, { status: 409 });
    }
    const updated = await prisma.kitchenPrintJob.update({
      where: { id: job.id },
      data: { status: "PRINTING", attempts: { increment: 1 } },
    });
    let payload: KitchenPrintPayload | null = null;
    try {
      payload = JSON.parse(updated.payloadJson) as KitchenPrintPayload;
    } catch {
      payload = null;
    }
    const escposBase64 = payload
      ? buildEscPosFromPayload(payload).toString("base64")
      : null;
    return NextResponse.json({
      job: {
        id: updated.id,
        payload,
        printerHost: payload?.printerHost ?? null,
        escposBase64,
      },
    });
  }

  if (body.action === "done") {
    await prisma.kitchenPrintJob.update({
      where: { id: job.id },
      data: { status: "DONE", printedAt: new Date(), errorMessage: null },
    });
    return NextResponse.json({ ok: true });
  }

  await prisma.kitchenPrintJob.update({
    where: { id: job.id },
    data: {
      status: "PENDING",
      errorMessage: body.error || "Chop etilmadi",
    },
  });
  return NextResponse.json({ ok: true });
}
