import axios from "axios";
import { SessionData, ConversationMemory } from "./sessionService";

const SUMMARY_N8N_WEBHOOK_URL =
  "https://n8n-excollo.azurewebsites.net/webhook/w1/summary";

interface N8nSummaryResponse {
  response: any[];
  error?: string;
  memory_context?: {
    last_topic: string | null;
    user_interests: string[];
    conversation_summary: string;
  };
}

export const summaryN8nService = {
  async createSummary(
    message: string,
    sessionData: SessionData,
    conversationHistory: ConversationMemory[] = [],
    namespace?: string,
    signal?: AbortSignal
  ): Promise<N8nSummaryResponse> {
    try {
      const params = new URLSearchParams({
        message,
        session_id: sessionData.id,
        conversation_history: JSON.stringify(
          conversationHistory.map((msg) => ({
            role: msg.type,
            content: msg.text,
            timestamp: msg.timestamp,
          }))
        ),
        timestamp: new Date().toISOString(),
        action: "summary", // or whatever action you want to identify
      });

      if (namespace) {
        params.append("namespace", namespace);
      }

      const response = await axios.get(
        `${SUMMARY_N8N_WEBHOOK_URL}?${params.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          signal,
        }
      );

      console.log("summary-response",response)

      let processedResponse;
      if (Array.isArray(response.data)) {
        processedResponse = response.data;
      } else {
        processedResponse = response.data;
      }

      return {
        response: processedResponse,
        memory_context: response.data[0]?.memory_context,
      };
    } catch (error) {
      if (axios.isCancel(error)) {
        return {
          response: [],
          error: "Request was canceled by the user.",
        };
      }
      return {
        response: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
