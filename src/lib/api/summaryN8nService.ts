import axios from "axios";
import { SessionData, ConversationMemory } from "./sessionService";

const SUMMARY_N8N_WEBHOOK_URL =
  "https://n8n-excollo.azurewebsites.net/webhook/3/summary";
const RHP_SUMMARY_N8N_WEBHOOK_URL =
  "https://n8n-excollo.azurewebsites.net/webhook/1/rhp/summary";

interface N8nSummaryResponse {
  executionId?: string;
  documentId?: string;
  status?: string;
  response?: any[];
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
    documentId?: string,
    signal?: AbortSignal,
    type?: string, // Add type parameter to determine which webhook to use
    rhpNamespace?: string // Add rhpNamespace parameter for RHP documents
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
        action: "summary",
      });

      // Use rhpNamespace if type is 'RHP', otherwise use regular namespace
      if (type === "RHP" && rhpNamespace) {
        params.append("namespace", rhpNamespace);
      } else if (namespace) {
        params.append("namespace", namespace);
      }

      if (documentId) {
        params.append("documentId", documentId);
      }

      // Attach domain from JWT if present
      try {
        const token = localStorage.getItem("accessToken");
        if (token) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          let domain: string | undefined = payload?.domain;
          if (!domain && typeof payload?.email === "string") {
            const parts = payload.email.split("@");
            if (parts.length === 2) domain = parts[1].toLowerCase();
          }
          if (domain) params.append("domain", domain);
        }
      } catch {}

      // Use RHP webhook if type is 'RHP', otherwise use default
      const webhookUrl =
        type === "RHP" ? RHP_SUMMARY_N8N_WEBHOOK_URL : SUMMARY_N8N_WEBHOOK_URL;

      const response = await axios.get(`${webhookUrl}?${params.toString()}`, {
        headers: {
          "Content-Type": "application/json",
        },
        signal,
      });
      console.log("Execution-response", response);

      // Expecting immediate response: { executionId, status, documentId }
      return {
        executionId: response.data[0].executionId,
        status: response.data[0].status,
        documentId: response.data[0].documentId,
        response: response.data[0].response,
        memory_context: response.data[0].memory_context,
        error: response.data[0].error,
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
