/**
 * AI Shopping Assistant Service
 * Connects to Go backend for Gemini 3 powered shopping assistant with Google Search Grounding
 */

import { apiClient } from './api.client';

export interface ConversationMessage {
  role: 'user' | 'model';
  text: string;
  thoughtSignature?: string;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface AssistantChatResult {
  response: string;
  sources?: GroundingSource[];
  thoughtSignature?: string;
  thinkingSummary?: string;
}

interface AssistantChatResponse {
  success: boolean;
  data?: AssistantChatResult;
  error?: string;
}

export const AssistantService = {
  /**
   * Send a message to the AI shopping assistant
   * Uses Gemini 3 Flash with Google Search Grounding for real-time market intelligence
   */
  async chat(
    query: string,
    listingId?: string,
    history?: ConversationMessage[]
  ): Promise<AssistantChatResult | null> {
    try {
      const response = await apiClient.post<AssistantChatResponse>('/api/assistant/chat', {
        listingId: listingId || '',
        history: history || [],
        query,
      });

      if (!response.success || !response.data) {
        return null;
      }

      return response.data;
    } catch (error) {
      return null;
    }
  },
};
