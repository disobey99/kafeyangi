import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCafeManager } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";
import { addBranch, createGroupFromCafe, getGroupBranches } from "@/lib/branches";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const feature = await checkPlanFeature(cafeId, "multiBranch");
  if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });

  const data = await getGroupBranches(cafeId);
  return NextResponse.json(data);
}

const createGroupSchema = z.object({
  action: z.literal("create_group"),
  name: z.string().min(2),
});

const addBranchSchema = z.object({
  action: z.literal("add_branch"),
  name: z.string().min(2),
  slug: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeManager(cafeId);
    if (!access.ok) return access.response;

    const feature = await checkPlanFeature(cafeId, "multiBranch");
    if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });

    const body = await request.json();

    if (body.action === "create_group") {
      const data = createGroupSchema.parse(body);
      const result = await createGroupFromCafe(cafeId, data.name);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    if (body.action === "add_branch") {
      const data = addBranchSchema.parse(body);
      const { group } = await getGroupBranches(cafeId);
      if (!group) {
        return NextResponse.json(
          { error: "Avval tarmoq yarating" },
          { status: 400 }
        );
      }
      const result = await addBranch(group.id, access.session.userId, data);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result, { status: 201 });
    }

    return NextResponse.json({ error: "Noto'g'ri amal" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }
}
