import { NextRequest, NextResponse } from "next/server";
import { listMenuTemplates } from "@/lib/menu-template-catalog";
import type { MenuFoodTagId } from "@/lib/menu-food-tags";
import { MENU_FOOD_TAG_ID_VALUES } from "@/lib/menu-food-tags";

export async function GET(request: NextRequest) {
  const tag = request.nextUrl.searchParams.get("tag");
  const q = request.nextUrl.searchParams.get("q") ?? undefined;

  if (tag && !MENU_FOOD_TAG_ID_VALUES.includes(tag as MenuFoodTagId)) {
    return NextResponse.json({ error: "Noto'g'ri tag" }, { status: 400 });
  }

  const templates = listMenuTemplates(tag as MenuFoodTagId | undefined, q);
  return NextResponse.json({ templates });
}
