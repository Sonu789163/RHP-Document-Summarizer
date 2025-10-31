import axios from "axios";
import { SessionData, ConversationMemory } from "./sessionService";

const N8N_WEBHOOK_URLS = {
  DRHP: "https://n8n-excollo.azurewebsites.net/webhook/1/chat/docs",
  RHP: "https://n8n-excollo.azurewebsites.net/webhook/1/chat/docs"
};

interface N8nResponse {
  response: any[];
  error?: string;
  memory_context?: {
    last_topic: string | null;
    user_interests: string[];
    conversation_summary: string;
  };
}

export const n8nService = {
  async sendMessage(
    message: string,
    sessionData: SessionData,
    conversationHistory: ConversationMemory[] = [],
    namespace?: string,
    documentType?: "DRHP" | "RHP",
    signal?: AbortSignal
  ): Promise<N8nResponse> {
    try {
      console.log("Sending message to N8n with namespace:", namespace, "documentType:", documentType);

      // Select the appropriate webhook URL based on document type
      const webhookUrl = documentType === "RHP" ? N8N_WEBHOOK_URLS.RHP : N8N_WEBHOOK_URLS.DRHP;
      console.log("Using webhook URL:", webhookUrl);

      // Convert the request data to query parameters
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
        action: "chat", // Add action to identify chat request
      });

      // Always include namespace in the request
      if (namespace) {
        params.append("namespace", namespace);
      }

      // Include document type in the request
      if (documentType) {
        params.append("document_type", documentType);
      }

      const response = await axios.get(
        `${webhookUrl}?${params.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Response received from N8n:", response.data);

      // Handle different response formats
      let processedResponse;
      if (Array.isArray(response.data)) {
        // For chat responses (single object with output)
        if (response.data.length === 1 && response.data[0].output) {
          processedResponse = response.data[0].output;
        }
        // For summary responses (array with PDF metadata and summary)
        else if (response.data.length >= 2) {
          processedResponse = response.data;
        }
        // Fallback for other array responses
        else {
          processedResponse = response.data;
        }
      } else {
        processedResponse = response.data;
      }

      return {
        response: processedResponse,
        memory_context: response.data[0]?.memory_context,
      };
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log("N8n request canceled:", error.message);
        return {
          response: [],
          error: "Request was canceled by the user.",
        };
      }
      console.error("Error sending message to N8n:", error);
      if (axios.isAxiosError(error)) {
        console.error("Response data:", error.response?.data);
        console.error("Response status:", error.response?.status);
        console.error("Response headers:", error.response?.headers);
      }
      return {
        response: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
