import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { requireCafeStaff } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";
import { isPinUnlocked, setPinUnlockCookie } from "@/lib/staff-pin";
import {
  consumeWebAuthnChallenge,
  publicKeyFromBase64Url,
  publicKeyToBase64Url,
  resolveWebAuthnRp,
  setWebAuthnChallenge,
  uint8FromUserId,
} from "@/lib/staff-webauthn";

async function getMember(cafeId: string, userId: string) {
  return prisma.cafeMember.findUnique({
    where: { cafeId_userId: { cafeId, userId } },
    select: {
      id: true,
      pinHash: true,
      pinResetRequired: true,
      webauthnCredentialId: true,
      webauthnPublicKey: true,
      webauthnCounter: true,
      user: { select: { email: true, name: true } },
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  const phase = new URL(request.url).searchParams.get("phase");
  const member = await getMember(cafeId, access.session.userId);
  if (!member) {
    return NextResponse.json({ error: "Xodim topilmadi" }, { status: 403 });
  }

  if (!member.pinHash || member.pinResetRequired) {
    return NextResponse.json(
      { error: "Avval PIN o'rnating" },
      { status: 400 },
    );
  }

  const { rpID, origin } = resolveWebAuthnRp(request);
  void origin;

  if (phase === "register-options") {
    const unlocked = await isPinUnlocked(cafeId, access.session.userId);
    if (!unlocked) {
      return NextResponse.json(
        { error: "Avval PIN bilan oching" },
        { status: 403 },
      );
    }

    const options = await generateRegistrationOptions({
      rpName: "Nookline Xodim",
      rpID,
      userName: member.user.email || member.user.name || access.session.userId,
      userDisplayName: member.user.name || member.user.email || "Xodim",
      userID: uint8FromUserId(access.session.userId) as any,
      attestationType: "none",
      timeout: 120_000,
      excludeCredentials:
        member.webauthnCredentialId &&
        !isNativeBioCredential(member.webauthnCredentialId)
          ? [{ id: member.webauthnCredentialId }]
          : [],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        // preferred — qayta kirishda platforma biometriyani topishi osonroq
        residentKey: "preferred",
        requireResidentKey: false,
      },
    });

    await setWebAuthnChallenge(
      cafeId,
      access.session.userId,
      options.challenge,
      "register",
    );

    return NextResponse.json(options);
  }

  if (phase === "authenticate-options") {
    if (!member.webauthnCredentialId || !member.webauthnPublicKey) {
      return NextResponse.json(
        { error: "Barmoq izi o'rnatilmagan" },
        { status: 400 },
      );
    }
    if (isNativeBioCredential(member.webauthnCredentialId)) {
      return NextResponse.json(
        { error: "APK biometriya — native-authenticate ishlating", native: true },
        { status: 400 },
      );
    }

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "required",
      timeout: 120_000,
      allowCredentials: [{ id: member.webauthnCredentialId }],
    });

    await setWebAuthnChallenge(
      cafeId,
      access.session.userId,
      options.challenge,
      "authenticate",
    );

    return NextResponse.json(options);
  }

  return NextResponse.json({ error: "phase kerak" }, { status: 400 });
}

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("register"),
    response: z.record(z.string(), z.unknown()),
  }),
  z.object({
    action: z.literal("authenticate"),
    response: z.record(z.string(), z.unknown()),
  }),
  z.object({
    action: z.literal("native-register"),
    secret: z.string().min(32).max(128),
  }),
  z.object({
    action: z.literal("native-authenticate"),
    secret: z.string().min(32).max(128),
  }),
  z.object({
    action: z.literal("disable"),
  }),
]);

function isNativeBioCredential(id: string | null | undefined) {
  return Boolean(id?.startsWith("native:"));
}

function hashNativeSecret(secret: string) {
  return createHash("sha256").update(`nookline-native-bio:${secret}`).digest("hex");
}

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

  const member = await getMember(cafeId, access.session.userId);
  if (!member) {
    return NextResponse.json({ error: "Xodim topilmadi" }, { status: 403 });
  }

  if (!member.pinHash || member.pinResetRequired) {
    return NextResponse.json(
      { error: "Avval PIN o'rnating" },
      { status: 400 },
    );
  }

  const { rpID, origin } = resolveWebAuthnRp(request);

  if (body.action === "disable") {
    const unlocked = await isPinUnlocked(cafeId, access.session.userId);
    if (!unlocked) {
      return NextResponse.json(
        { error: "Avval PIN bilan oching" },
        { status: 403 },
      );
    }
    await prisma.cafeMember.update({
      where: { id: member.id },
      data: {
        webauthnCredentialId: null,
        webauthnPublicKey: null,
        webauthnCounter: 0,
      },
    });
    return NextResponse.json({ ok: true, hasBiometric: false });
  }

  if (body.action === "native-register") {
    const unlocked = await isPinUnlocked(cafeId, access.session.userId);
    if (!unlocked) {
      return NextResponse.json(
        { error: "Avval PIN bilan oching" },
        { status: 403 },
      );
    }
    const secretHash = hashNativeSecret(body.secret);
    await prisma.cafeMember.update({
      where: { id: member.id },
      data: {
        webauthnCredentialId: `native:${access.session.userId}`,
        webauthnPublicKey: secretHash,
        webauthnCounter: 0,
      },
    });
    return NextResponse.json({ ok: true, hasBiometric: true, mode: "native" });
  }

  if (body.action === "native-authenticate") {
    if (
      !isNativeBioCredential(member.webauthnCredentialId) ||
      !member.webauthnPublicKey
    ) {
      return NextResponse.json(
        { error: "Barmoq izi o'rnatilmagan" },
        { status: 400 },
      );
    }
    const secretHash = hashNativeSecret(body.secret);
    if (secretHash !== member.webauthnPublicKey) {
      return NextResponse.json(
        { error: "Barmoq izi tasdiqlanmadi" },
        { status: 401 },
      );
    }
    await setPinUnlockCookie(cafeId, access.session.userId);
    return NextResponse.json({ ok: true, unlocked: true, mode: "native" });
  }

  if (body.action === "register") {
    const unlocked = await isPinUnlocked(cafeId, access.session.userId);
    if (!unlocked) {
      return NextResponse.json(
        { error: "Avval PIN bilan oching" },
        { status: 403 },
      );
    }

    const expectedChallenge = await consumeWebAuthnChallenge(
      cafeId,
      access.session.userId,
      "register",
    );
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: "Sessiya muddati tugadi — qayta urinib ko'ring" },
        { status: 400 },
      );
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body.response as unknown as RegistrationResponseJSON,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      });
    } catch (e) {
      console.error("webauthn register verify:", e);
      return NextResponse.json(
        { error: "Barmoq izi ro'yxatdan o'tmadi" },
        { status: 400 },
      );
    }

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: "Barmoq izi tasdiqlanmadi" },
        { status: 400 },
      );
    }

    const { credential } = verification.registrationInfo;
    await prisma.cafeMember.update({
      where: { id: member.id },
      data: {
        webauthnCredentialId: credential.id,
        webauthnPublicKey: publicKeyToBase64Url(credential.publicKey),
        webauthnCounter: credential.counter,
      },
    });

    return NextResponse.json({ ok: true, hasBiometric: true });
  }

  // authenticate
  if (!member.webauthnCredentialId || !member.webauthnPublicKey) {
    return NextResponse.json(
      { error: "Barmoq izi o'rnatilmagan" },
      { status: 400 },
    );
  }

  const expectedChallenge = await consumeWebAuthnChallenge(
    cafeId,
    access.session.userId,
    "authenticate",
  );
  if (!expectedChallenge) {
    return NextResponse.json(
      { error: "Sessiya muddati tugadi — qayta urinib ko'ring" },
      { status: 400 },
    );
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response as unknown as AuthenticationResponseJSON,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: member.webauthnCredentialId,
        publicKey: publicKeyFromBase64Url(member.webauthnPublicKey) as any,
        counter: member.webauthnCounter,
      },
    });
  } catch (e) {
    console.error("webauthn auth verify:", e);
    return NextResponse.json(
      { error: "Barmoq izi tasdiqlanmadi" },
      { status: 401 },
    );
  }

  if (!verification.verified) {
    return NextResponse.json(
      { error: "Barmoq izi tasdiqlanmadi" },
      { status: 401 },
    );
  }

  await prisma.cafeMember.update({
    where: { id: member.id },
    data: { webauthnCounter: verification.authenticationInfo.newCounter },
  });
  await setPinUnlockCookie(cafeId, access.session.userId);

  return NextResponse.json({ ok: true, unlocked: true });
}
