import { afterEach, describe, expect, it, vi } from 'vitest';
import { VisionSearchService } from './vision-search.service';

describe('VisionSearchService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed vision search result on success', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            query: 'iphone 15 pro',
            confidence: 0.91,
            keywords: ['iphone', 'smartphone'],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const file = new File([new Uint8Array([1, 2, 3])], 'photo.jpg', { type: 'image/jpeg' });
    const result = await VisionSearchService.searchByImage(file);

    expect(result.query).toBe('iphone 15 pro');
    expect(result.confidence).toBe(0.91);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8080/api/search/vision');
  });

  it('throws API error message when backend returns failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: 'Unsupported image format',
        }),
        { status: 415, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const file = new File([new Uint8Array([4, 5, 6])], 'photo.txt', { type: 'text/plain' });

    await expect(VisionSearchService.searchByImage(file)).rejects.toThrow('Unsupported image format');
  });

  it('throws fallback error when backend returns malformed payload', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ foo: 'bar' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const file = new File([new Uint8Array([7, 8, 9])], 'photo.jpg', { type: 'image/jpeg' });
    await expect(VisionSearchService.searchByImage(file)).rejects.toThrow('Vision search failed');
  });
});
