/**
 * Global registry of SSE (Server-Sent Events) connections per fleet session.
 * Persists across Next.js hot-module reloads via the global object.
 */

type SSEController = ReadableStreamDefaultController<Uint8Array>;

declare global {
  // eslint-disable-next-line no-var
  var __fleetSSEConnections: Map<string, Set<SSEController>> | undefined;
}

const connections: Map<string, Set<SSEController>> =
  global.__fleetSSEConnections ??
  (global.__fleetSSEConnections = new Map());

const encoder = new TextEncoder();

export function addConnection(
  sessionId: string,
  controller: SSEController,
): void {
  if (!connections.has(sessionId)) {
    connections.set(sessionId, new Set());
  }
  connections.get(sessionId)!.add(controller);
}

export function removeConnection(
  sessionId: string,
  controller: SSEController,
): void {
  const set = connections.get(sessionId);
  if (!set) return;
  set.delete(controller);
  if (set.size === 0) connections.delete(sessionId);
}

export function broadcastToSession(sessionId: string, event: object): void {
  const set = connections.get(sessionId);
  if (!set || set.size === 0) return;

  const data = encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
  const dead: SSEController[] = [];

  for (const controller of set) {
    try {
      controller.enqueue(data);
    } catch {
      dead.push(controller);
    }
  }

  for (const c of dead) set.delete(c);
  if (set.size === 0) connections.delete(sessionId);
}
