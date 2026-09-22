import { fetchApi } from './client';
import { AIResponseData } from '../../types';

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL;

export async function sendAIChatMessage(conversationId: string, message: string): Promise<{ success: boolean; data: AIResponseData }> {
  // If dedicated FastAPI / AI service is enabled, route directly to it
  if (AI_SERVICE_URL) {
    try {
      const res = await fetch(`${AI_SERVICE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('AI microservice request failed, falling back to main backend API:', err);
    }
  }

  // Default fallback to main Node.js Express Backend REST API
  return fetchApi<AIResponseData>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ conversationId, message }),
  });
}
