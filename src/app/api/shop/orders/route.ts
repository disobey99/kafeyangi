import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureShopOrderTables } from "@/lib/shop-order-tables";
import { notifyPlatformShopOrder } from "@/lib/shop-order-notify";
import {
  loadActiveShopDiscounts,
  resolveCheckoutLines,
} from "@/lib/shop-pricing";
import {
  applyShopStockChange,
  ensureShopStockTables,
} from "@/lib/shop-stock";

const bodySchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(7).max(40),
  customerNote: z.string().trim().max(500).optional().nullable(),
  promoCode: z.string().trim().max(40).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
});

function cuidLike() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ma’lumotlar noto‘g‘ri. Ism, telefon va mahsulotlar kerak." },
        { status: 400 },
      );
    }

    const { customerName, customerPhone, customerNote, promoCode, items } =
      parsed.data;
    await ensureShopOrderTables();
    await ensureShopStockTables();

    const ids = [...new Set(items.map((i) => i.productId))];
    const products = await prisma.shopProduct.findMany({
      where: { id: { in: ids }, status: "ACTIVE" },
      select: { id: true, name: true, price: true, stock: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const draftLines: Array<{
      productId: string;
      productName: string;
      listPrice: number;
      qty: number;
    }> = [];

    for (const item of items) {
      const p = byId.get(item.productId);
      if (!p) {
        return NextResponse.json(
          { error: "Ba’zi mahsulotlar sotuvda emas" },
          { status: 400 },
        );
      }
      if (p.stock < item.qty) {
        return NextResponse.json(
          { error: `"${p.name}" omborda yetarli emas` },
          { status: 400 },
        );
      }
      draftLines.push({
        productId: p.id,
        productName: p.name,
        listPrice: p.price,
        qty: item.qty,
      });
    }

    const discounts = await loadActiveShopDiscounts();
    const code = promoCode?.trim().toUpperCase() || null;
    if (code) {
      const hit = discounts.find((d) => d.code === code);
      if (!hit) {
        return NextResponse.json(
          { error: "Promo kod topilmadi yoki muddati tugagan" },
          { status: 400 },
        );
      }
    }

    const priced = resolveCheckoutLines(draftLines, discounts, code);
    const lines = priced.lines.map((l) => ({
      productId: l.productId,
      productName: l.productName,
      unitPrice: l.unitPrice,
      qty: l.qty,
    }));
    const total = priced.total;
    const orderId = cuidLike();
    const now = new Date();

    const noteParts = [
      customerNote?.trim() || "",
      code ? `Promo: ${code}` : "",
    ].filter(Boolean);
    const noteStored = noteParts.join(" · ") || null;

    await prisma.$transaction(async (tx) => {
      for (const line of lines) {
        await applyShopStockChange({
          tx,
          productId: line.productId,
          type: "SALE",
          qty: line.qty,
          note: `Sotuv #${orderId.slice(-8)}`,
          orderId,
        });
      }

      for (const discountId of priced.usedDiscountIds) {
        await tx.shopDiscount.update({
          where: { id: discountId },
          data: { usedCount: { increment: 1 } },
        });
      }

      await tx.$executeRaw`
        INSERT INTO "ShopOrder" ("id","customerName","customerPhone","customerNote","status","total","stockRestored","createdAt","updatedAt")
        VALUES (${orderId}, ${customerName}, ${customerPhone}, ${noteStored}, CAST('NEW' AS "ShopOrderStatus"), ${total}, false, ${now}, ${now})
      `;

      for (const line of lines) {
        const itemId = cuidLike();
        await tx.$executeRaw`
          INSERT INTO "ShopOrderItem" ("id","orderId","productId","productName","unitPrice","qty")
          VALUES (${itemId}, ${orderId}, ${line.productId}, ${line.productName}, ${line.unitPrice}, ${line.qty})
        `;
      }
    });

    void notifyPlatformShopOrder({
      orderId,
      customerName,
      customerPhone,
      customerNote: noteStored,
      total,
      items: lines,
    }).catch((err) => console.error("[shop-order notify]", err));

    return NextResponse.json({
      ok: true,
      order: { id: orderId, total, createdAt: now },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("omborda yetarli")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("[shop/orders POST]", e);
    // stockRestored column yo‘q bo‘lsa — fallback insert
    if (String(e).includes("stockRestored")) {
      return NextResponse.json(
        {
          error:
            "Ombor yangilandi, buyurtma jadvali eski. Sahifani yangilab qayta urinib ko‘ring.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Buyurtma saqlanmadi. Qayta urinib ko‘ring." },
      { status: 500 },
    );
  }
}
