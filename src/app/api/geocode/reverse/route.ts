import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reverseGeocode } from "@/lib/geocode";

const schema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const result = await reverseGeocode(body.latitude, body.longitude);
    if (!result) {
      return NextResponse.json({ error: "Manzil topilmadi" }, { status: 404 });
    }
    return NextResponse.json({ location: result });
  } catch {
    return NextResponse.json({ error: "Noto'g'ri koordinata" }, { status: 400 });
  }
}
