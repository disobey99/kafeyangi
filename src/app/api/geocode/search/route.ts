import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { geocodeAddress } from "@/lib/geocode";

const schema = z.object({
  address: z.string().trim().min(3).max(240),
  nearLat: z.number().min(-90).max(90).optional().nullable(),
  nearLng: z.number().min(-180).max(180).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const result = await geocodeAddress(body.address, {
      nearLat: body.nearLat,
      nearLng: body.nearLng,
    });
    if (!result) {
      return NextResponse.json({ error: "Manzil topilmadi" }, { status: 404 });
    }
    return NextResponse.json({
      location: {
        latitude: result.latitude,
        longitude: result.longitude,
        address: result.displayName || result.address,
        region: result.region,
        query: result.address,
      },
    });
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }
}
