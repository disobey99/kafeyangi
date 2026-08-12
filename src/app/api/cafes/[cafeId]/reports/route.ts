import { NextRequest, NextResponse } from "next/server";
import { requireCafeManager } from "@/lib/cafe-access";
import { checkPlanFeature, getCafePlanContext } from "@/lib/plan-access";
import {
  getReports,
  resolveReportRange,
  type ReportPeriod,
  type ReportQuery,
} from "@/lib/reports";

function parseReportQuery(request: NextRequest): ReportQuery | { error: string } {
  const raw = request.nextUrl.searchParams.get("period") || "day";
  const period = (
    ["day", "week", "month", "custom"].includes(raw) ? raw : "day"
  ) as ReportPeriod;
  const from = request.nextUrl.searchParams.get("from") || undefined;
  const to = request.nextUrl.searchParams.get("to") || undefined;
  const query: ReportQuery = { period, from, to };
  const range = resolveReportRange(query);
  if (!range.ok) return { error: range.error };
  return query;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const reportsGate = await checkPlanFeature(cafeId, "reports");
  if (!reportsGate.ok) {
    return NextResponse.json({ error: reportsGate.error }, { status: 403 });
  }

  const parsed = parseReportQuery(request);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const data = await getReports(cafeId, parsed);
    const planCtx = await getCafePlanContext(cafeId);
    if (!planCtx?.config.features.abcAnalysis) {
      return NextResponse.json({ ...data, abcProducts: [] });
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hisobot xatosi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
