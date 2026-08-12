import { NextRequest, NextResponse } from "next/server";
import { requireCafeStaff } from "@/lib/cafe-access";
import { publishCafeEvent } from "@/lib/realtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeStaff(cafeId);
    if (!access.ok) return access.response;

    const body = await request.json();
    const { channel, audio, mimeType, senderName, senderRole, kind } = body;

    if (!channel) {
      return NextResponse.json({ error: "Kanal kerak" }, { status: 400 });
    }

    const sender = {
      senderId: access.session.userId,
      senderName: senderName || access.session.name || "Xodim",
      senderRole: senderRole || access.role || "STAFF",
      channel,
      sentAt: new Date().toISOString(),
    };

    // Mikrofon bosilganda — qisqa PTT signali
    if (kind === "ptt") {
      publishCafeEvent(cafeId, {
        type: "walkie.ptt",
        payload: sender,
      });
      return NextResponse.json({ ok: true });
    }

    if (!audio) {
      return NextResponse.json({ error: "Audio ma'lumotlari kerak" }, { status: 400 });
    }

    publishCafeEvent(cafeId, {
      type: "walkie.talkie",
      payload: {
        ...sender,
        audio,
        mimeType: typeof mimeType === "string" ? mimeType : "audio/webm",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Walkie talkie transmit error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
