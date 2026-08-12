import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCafeStaff } from "@/lib/cafe-access";
import { requireCafeManager } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";
import { publishCafeEvent } from "@/lib/realtime";
import {
  clearPinUnlockCookie,
  hashStaffPin,
  isPinUnlocked,
  isValidPin,
  setPinUnlockCookie,
  verifyStaffPin,
} from "@/lib/staff-pin";

async function getMember(cafeId: string, userId: string) {
  return prisma.cafeMember.findUnique({
    where: { cafeId_userId: { cafeId, userId } },
    select: {
      id: true,
      pinHash: true,
      pinResetRequired: true,
      webauthnCredentialId: true,
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  const member = await getMember(cafeId, access.session.userId);
  if (!member) {
    return NextResponse.json({ error: "Xodim topilmadi" }, { status: 403 });
  }

  const needsSetup = !member.pinHash || member.pinResetRequired;
  const unlocked = needsSetup
    ? false
    : await isPinUnlocked(cafeId, access.session.userId);

  return NextResponse.json({
    hasPin: Boolean(member.pinHash) && !member.pinResetRequired,
    needsSetup,
    unlocked,
    resetRequired: member.pinResetRequired,
    hasBiometric: Boolean(member.webauthnCredentialId) && !member.pinResetRequired,
  });
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("setup"),
    pin: z.string(),
    confirmPin: z.string(),
  }),
  z.object({
    action: z.literal("verify"),
    pin: z.string(),
  }),
  z.object({
    action: z.literal("lock"),
  }),
  z.object({
    action: z.literal("remove"),
    pin: z.string(),
  }),
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  let body: z.infer<typeof actionSchema>;
  try {
    body = actionSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }

  const member = await getMember(cafeId, access.session.userId);
  if (!member) {
    return NextResponse.json({ error: "Xodim topilmadi" }, { status: 403 });
  }

  if (body.action === "lock") {
    await clearPinUnlockCookie(cafeId, access.session.userId);
    return NextResponse.json({ ok: true, unlocked: false });
  }

  if (body.action === "remove") {
    if (!member.pinHash || member.pinResetRequired) {
      return NextResponse.json({ error: "Parol o'rnatilmagan" }, { status: 400 });
    }
    if (!isValidPin(body.pin)) {
      return NextResponse.json({ error: "6 xonali parol kiriting" }, { status: 400 });
    }
    const valid = await verifyStaffPin(body.pin, member.pinHash);
    if (!valid) {
      return NextResponse.json({ error: "Parol noto'g'ri" }, { status: 401 });
    }
    await prisma.cafeMember.update({
      where: { id: member.id },
      data: {
        pinHash: null,
        pinResetRequired: false,
        webauthnCredentialId: null,
        webauthnPublicKey: null,
        webauthnCounter: 0,
      },
    });
    await clearPinUnlockCookie(cafeId, access.session.userId);
    return NextResponse.json({ ok: true, hasPin: false, unlocked: false });
  }

  if (body.action === "setup") {
    if (!isValidPin(body.pin) || body.pin !== body.confirmPin) {
      return NextResponse.json(
        { error: "6 xonali raqamli parol kiriting va tasdiqlang" },
        { status: 400 },
      );
    }

    const pinHash = await hashStaffPin(body.pin);
    // Admin reset / birinchi o‘rnatishda bio tozalanadi; oddiy PIN yangilashda saqlanadi
    const wipeBio = !member.pinHash || member.pinResetRequired;
    await prisma.cafeMember.update({
      where: { id: member.id },
      data: {
        pinHash,
        pinResetRequired: false,
        ...(wipeBio
          ? {
              webauthnCredentialId: null,
              webauthnPublicKey: null,
              webauthnCounter: 0,
            }
          : {}),
      },
    });
    await setPinUnlockCookie(cafeId, access.session.userId);

    return NextResponse.json({ ok: true, unlocked: true, hasPin: true });
  }

  if (!member.pinHash || member.pinResetRequired) {
    return NextResponse.json(
      { error: "Avval yangi parol o'rnating" },
      { status: 400 },
    );
  }

  if (!isValidPin(body.pin)) {
    return NextResponse.json(
      { error: "6 xonali parol kiriting" },
      { status: 400 },
    );
  }

  const valid = await verifyStaffPin(body.pin, member.pinHash);
  if (!valid) {
    return NextResponse.json({ error: "Parol noto'g'ri" }, { status: 401 });
  }

  await setPinUnlockCookie(cafeId, access.session.userId);
  return NextResponse.json({ ok: true, unlocked: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const memberId = new URL(_request.url).searchParams.get("memberId");
  if (!memberId) {
    return NextResponse.json({ error: "memberId kerak" }, { status: 400 });
  }

  const member = await prisma.cafeMember.findFirst({
    where: { id: memberId, cafeId },
    select: { id: true, userId: true },
  });

  if (!member) {
    return NextResponse.json({ error: "Xodim topilmadi" }, { status: 403 });
  }

  await prisma.cafeMember.update({
    where: { id: member.id },
    data: {
      pinHash: null,
      pinResetRequired: true,
      webauthnCredentialId: null,
      webauthnPublicKey: null,
      webauthnCounter: 0,
    },
  });

  await clearPinUnlockCookie(cafeId, member.userId);

  publishCafeEvent(cafeId, {
    type: "staff.pin.reset",
    payload: { userId: member.userId },
  });

  return NextResponse.json({ ok: true });
}
