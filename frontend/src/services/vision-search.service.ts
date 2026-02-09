const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface VisionSearchResult {
  query: string;
  confidence: number;
  keywords?: string[];
  category?: string;
}

interface VisionSearchAPIResponse {
  success: boolean;
  data?: VisionSearchResult;
  error?: string;
}

export const VisionSearchService = {
  async searchByImage(imageFile: File): Promise<VisionSearchResult> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`${API_BASE_URL}/api/search/vision`, {
      method: 'POST',
      body: formData,
    });

    const payload = (await response.json().catch(() => null)) as VisionSearchAPIResponse | null;
    if (!response.ok || !payload?.success || !payload.data?.query) {
      throw new Error(payload?.error || 'Vision search failed');
    }

    return payload.data;
  },
};
