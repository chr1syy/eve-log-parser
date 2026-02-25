import { NextRequest } from "next/server";
import { getSession } from "@/lib/fleet/sessionStore";
import {
  addConnection,
  removeConnection,
} from "@/lib/fleet/sseConnections";

const encoder = new TextEncoder();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Reject unknown sessions early
  if (!getSession(id)) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let heartbeatTimer: ReturnType<typeof setInterval>;

  const cleanup = () => {
    clearInterval(heartbeatTimer);
    if (controller) removeConnection(id, controller);
  };

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
      addConnection(id, controller);

      // Confirm connection to client
      c.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));

      // Keep the connection alive — some proxies close idle SSE streams
      heartbeatTimer = setInterval(() => {
        try {
          c.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          cleanup();
        }
      }, 25_000);
    },
    cancel() {
      cleanup();
    },
  });

  // Also clean up when the request is aborted (tab closed, navigation away)
  request.signal.addEventListener("abort", cleanup);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      // Prevent Next.js / CDN caching
      "X-Accel-Buffering": "no",
    },
  });
}
