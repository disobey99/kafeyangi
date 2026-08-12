import { subscribePlatform } from "@/lib/realtime";
import { getSession, isPlatformAccess } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !isPlatformAccess(session)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(data: string) {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }

      send(JSON.stringify({ type: "connected" }));

      const unsubscribe = subscribePlatform((event) => {
        send(JSON.stringify(event));
      });

      const heartbeat = setInterval(() => {
        send(JSON.stringify({ type: "ping" }));
      }, 25000);

      request.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(heartbeat);
        controller.close();
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
