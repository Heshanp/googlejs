import { AuthService } from './auth.service';
import { ApiError, apiClient } from './api.client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface ProBackdropResponse {
  success: boolean;
  data?: {
    imageBase64: string;
    mimeType: string;
    filename: string;
    meta: {
      model: string;
      promptVersion: string;
    };
  };
  error?: string;
}

export interface EnhancedImageResult {
  file: File;
  mimeType: string;
  filename: string;
  model: string;
  promptVersion: string;
}

function base64ToFile(base64: string, filename: string, mimeType: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mimeType });
}

function ensureValidResponse(response: ProBackdropResponse): asserts response is Required<Pick<ProBackdropResponse, 'success' | 'data'>> & ProBackdropResponse {
  if (!response.success || !response.data) {
    throw new ApiError(response.error || 'Image enhancement failed', 'API_ERROR');
  }
}

export const ImageEnhancementService = {
  async generateProBackdropFromFile(file: File, style?: string): Promise<EnhancedImageResult> {
    const formData = new FormData();
    formData.append('image', file);
    if (style) {
      formData.append('style', style);
    }

    const response = await fetch(`${API_BASE_URL}/api/images/pro-backdrop`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AuthService.getStoredToken()}`,
      },
      body: formData,
    });

    const body = (await response.json()) as ProBackdropResponse;
    if (!response.ok) {
      throw new ApiError(body.error || 'Image enhancement failed', 'API_ERROR', response.status);
    }
    ensureValidResponse(body);

    return {
      file: base64ToFile(body.data.imageBase64, body.data.filename, body.data.mimeType),
      filename: body.data.filename,
      mimeType: body.data.mimeType,
      model: body.data.meta.model,
      promptVersion: body.data.meta.promptVersion,
    };
  },

  async generateProBackdropFromListingImage(listingPublicId: string, imageId: number, style?: string): Promise<EnhancedImageResult> {
    const body = await apiClient.post<ProBackdropResponse>('/api/images/pro-backdrop', {
      listingPublicId,
      imageId,
      style,
    });

    ensureValidResponse(body);

    return {
      file: base64ToFile(body.data.imageBase64, body.data.filename, body.data.mimeType),
      filename: body.data.filename,
      mimeType: body.data.mimeType,
      model: body.data.meta.model,
      promptVersion: body.data.meta.promptVersion,
    };
  },
};
