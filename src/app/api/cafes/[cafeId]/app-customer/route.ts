import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { normalizePhone } from "@/lib/loyalty";
import { prisma } from "@/lib/prisma";

type CustomerRow = {
  id: string;
  cafeId: string;
  phone: string;
  name: string;
  address: string;
  email: string | null;
  passwordHash: string | null;
  lat: number | null;
  lng: number | null;
};

function toProfile(row: {
  name: string;
  phone: string;
  address: string;
  email: string | null;
  lat: number | null;
  lng: number | null;
}) {
  return {
    name: row.name,
    phone: row.phone,
    address: row.address || "",
    email: row.email || undefined,
    lat: row.lat,
    lng: row.lng,
  };
}

async function findByPhone(cafeId: string, phone: string): Promise<CustomerRow | null> {
  const rows = await prisma.$queryRaw<CustomerRow[]>`
    SELECT id, cafeId, phone, name, address, email, passwordHash, lat, lng
    FROM CafeAppCustomer
    WHERE cafeId = ${cafeId} AND phone = ${phone}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const rawPhone = request.nextUrl.searchParams.get("phone") ?? "";
  const phone = normalizePhone(rawPhone);
  if (phone.length < 12) {
    return NextResponse.json({ error: "Telefon kerak" }, { status: 400 });
  }

  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    select: { id: true },
  });
  if (!cafe) {
    return NextResponse.json({ error: "Kafe topilmadi" }, { status: 404 });
  }

  const row = await findByPhone(cafeId, phone);
  if (!row) {
    return NextResponse.json({ found: false, profile: null, hasPassword: false });
  }

  return NextResponse.json({
    found: true,
    profile: toProfile(row),
    hasPassword: Boolean(row.passwordHash),
  });
}

const saveSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().min(9),
  address: z.string().max(300).optional().default(""),
  email: z.string().email().optional().or(z.literal("")),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
});

const registerSchema = z.object({
  action: z.literal("register"),
  name: z.string().min(2).max(80),
  phone: z.string().min(9),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  address: z.string().max(300).optional().default(""),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
});

const loginSchema = z.object({
  action: z.literal("login"),
  phone: z.string().min(9),
  password: z.string().min(1).max(72),
});

function newId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;

  try {
    const raw = await request.json();
    const cafe = await prisma.cafe.findUnique({
      where: { id: cafeId },
      select: { id: true },
    });
    if (!cafe) {
      return NextResponse.json({ error: "Kafe topilmadi" }, { status: 404 });
    }

    if (raw?.action === "login") {
      const body = loginSchema.parse(raw);
      const phone = normalizePhone(body.phone);
      if (phone.length < 12) {
        return NextResponse.json({ error: "Telefon noto'g'ri" }, { status: 400 });
      }
      const row = await findByPhone(cafeId, phone);
      if (!row?.passwordHash) {
        return NextResponse.json(
          { error: "Telefon yoki parol noto'g'ri" },
          { status: 401 },
        );
      }
      const ok = await bcrypt.compare(body.password, row.passwordHash);
      if (!ok) {
        return NextResponse.json(
          { error: "Telefon yoki parol noto'g'ri" },
          { status: 401 },
        );
      }
      return NextResponse.json({ ok: true, profile: toProfile(row) });
    }

    if (raw?.action === "register") {
      const body = registerSchema.parse(raw);
      const phone = normalizePhone(body.phone);
      if (phone.length < 12) {
        return NextResponse.json({ error: "Telefon noto'g'ri" }, { status: 400 });
      }
      const email = body.email.trim().toLowerCase();
      const existing = await findByPhone(cafeId, phone);
      if (existing?.passwordHash) {
        return NextResponse.json(
          { error: "Bu telefon allaqachon ro'yxatdan o'tgan. Login qiling." },
          { status: 409 },
        );
      }
      const passwordHash = await bcrypt.hash(body.password, 10);
      const name = body.name.trim();
      const address = (body.address || "").trim();
      const lat = body.lat ?? null;
      const lng = body.lng ?? null;
      const now = new Date().toISOString();

      if (existing) {
        await prisma.$executeRaw`
          UPDATE CafeAppCustomer
          SET name = ${name},
              email = ${email},
              passwordHash = ${passwordHash},
              address = ${address},
              lat = ${lat},
              lng = ${lng},
              updatedAt = ${now}
          WHERE id = ${existing.id}
        `;
      } else {
        const id = newId();
        await prisma.$executeRaw`
          INSERT INTO CafeAppCustomer
            (id, cafeId, phone, name, email, passwordHash, address, lat, lng, createdAt, updatedAt)
          VALUES
            (${id}, ${cafeId}, ${phone}, ${name}, ${email}, ${passwordHash}, ${address}, ${lat}, ${lng}, ${now}, ${now})
        `;
      }

      const row = await findByPhone(cafeId, phone);
      if (!row) {
        return NextResponse.json({ error: "Saqlashda xatolik" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, profile: toProfile(row) });
    }

    const body = saveSchema.parse(raw);
    const phone = normalizePhone(body.phone);
    if (phone.length < 12) {
      return NextResponse.json({ error: "Telefon noto'g'ri" }, { status: 400 });
    }

    const name = body.name.trim();
    const address = (body.address || "").trim();
    const email = body.email?.trim() ? body.email.trim().toLowerCase() : null;
    const lat = body.lat ?? null;
    const lng = body.lng ?? null;
    const now = new Date().toISOString();
    const existing = await findByPhone(cafeId, phone);

    if (existing) {
      await prisma.$executeRaw`
        UPDATE CafeAppCustomer
        SET name = ${name},
            address = ${address},
            email = COALESCE(${email}, email),
            lat = ${lat},
            lng = ${lng},
            updatedAt = ${now}
        WHERE id = ${existing.id}
      `;
    } else {
      const id = newId();
      await prisma.$executeRaw`
        INSERT INTO CafeAppCustomer
          (id, cafeId, phone, name, email, passwordHash, address, lat, lng, createdAt, updatedAt)
        VALUES
          (${id}, ${cafeId}, ${phone}, ${name}, ${email}, NULL, ${address}, ${lat}, ${lng}, ${now}, ${now})
      `;
    }

    const row = await findByPhone(cafeId, phone);
    if (!row) {
      return NextResponse.json({ error: "Saqlashda xatolik" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, profile: toProfile(row) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message || "Noto'g'ri ma'lumot" },
        { status: 400 },
      );
    }
    console.error("app-customer error:", err);
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }
}
