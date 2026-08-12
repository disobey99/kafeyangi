import { CafeRole } from "@prisma/client";
import { subscribeCafe } from "@/lib/realtime";
import { requireCafeStaff } from "@/lib/cafe-access";

/** Vercel serverless: SSE + Redis subscribe uchun */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Xodim / egasi sessiyasi bo‘lmasa SSE ochilmaydi (cookie orqali). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;

  const access = await requireCafeStaff(cafeId, [
    CafeRole.OWNER,
    CafeRole.MANAGER,
    CafeRole.CASHIER,
    CafeRole.WAITER,
    CafeRole.KITCHEN,
    CafeRole.COURIER,
  ]);
  if (!access.ok) {
    return new Response(JSON.stringify({ error: "Kirish kerak" }), {
      status: access.response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(data: string) {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          /* stream yopilgan */
        }
      }

      send(JSON.stringify({ type: "connected" }));

      const unsubscribe = subscribeCafe(cafeId, (event) => {
        send(JSON.stringify(event));
      });

      const heartbeat = setInterval(() => {
        send(JSON.stringify({ type: "ping" }));
      }, 25000);

      request.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
