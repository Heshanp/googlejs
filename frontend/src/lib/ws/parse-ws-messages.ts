export type WebSocketEvent = {
  type: string;
  [key: string]: any;
};

export function parseWebSocketMessages(payload: unknown): WebSocketEvent[] {
  if (typeof payload !== 'string') return [];

  return payload
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean) as WebSocketEvent[];
}

