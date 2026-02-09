import { describe, it, expect } from 'vitest';
import { parseWebSocketMessages } from './parse-ws-messages';

describe('parseWebSocketMessages', () => {
  it('parses newline-delimited JSON payloads', () => {
    const payload = '{"type":"a","value":1}\n{"type":"b","value":2}';
    const events = parseWebSocketMessages(payload);

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('a');
    expect(events[1].type).toBe('b');
  });

  it('returns an empty array for non-string payloads', () => {
    expect(parseWebSocketMessages(null)).toEqual([]);
    expect(parseWebSocketMessages({})).toEqual([]);
  });
});
