import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";
import { publishCafeEvent } from "@/lib/realtime";

const schema = z.object({
  sensorName: z.string().min(1),
  temperature: z.number(),
  threshold: z.number().default(5),
  payload: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  const feature = await checkPlanFeature(cafeId, "freezerMonitoring");
  if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });

  const events = await prisma.ioTTemperatureEvent.findMany({
    where: { cafeId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ events });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const body = await request.json();

  const webhookKey = request.headers.get("x-iot-webhook-key");
  const webhookAllowed = Boolean(process.env.IOT_WEBHOOK_KEY && webhookKey === process.env.IOT_WEBHOOK_KEY);
  if (!webhookAllowed) {
    const access = await requireCafeStaff(cafeId);
    if (!access.ok) {
      return access.response;
    }
    const feature = await checkPlanFeature(cafeId, "freezerMonitoring");
    if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });
  }
  if (!webhookAllowed && process.env.IOT_WEBHOOK_KEY && webhookKey && webhookKey !== process.env.IOT_WEBHOOK_KEY) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const input = schema.parse(body);
  const isAlarm = input.temperature > input.threshold;
  const event = await prisma.ioTTemperatureEvent.create({
    data: {
      cafeId,
      sensorName: input.sensorName,
      temperature: input.temperature,
      threshold: input.threshold,
      isAlarm,
      payload: input.payload,
    },
  });
  if (isAlarm) {
    publishCafeEvent(cafeId, { type: "ops.iot.alarm", payload: { event } });
  }

  return NextResponse.json({ event, alarm: isAlarm });
}
