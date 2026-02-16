import axios from "axios";
import { SessionData, ConversationMemory } from "./sessionService";

const n8n_webhook_url = import.meta.env.VITE_N8N_WEBHOOK_URL;

const SUMMARY_N8N_WEBHOOK_URL =
  `${n8n_webhook_url}/webhook/3/summary`;
const RHP_SUMMARY_N8N_WEBHOOK_URL =
  `${n8n_webhook_url}/webhook/1/rhp/summary`;

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

      if (type) {
        params.append("documentType", type);
      }

      // Attach domain, domainId, and workspaceId from JWT/localStorage/document if present
      try {
        const token = localStorage.getItem("accessToken");
        let domainId: string | undefined;

        if (token) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          let domain: string | undefined = payload?.domain;
          if (!domain && typeof payload?.email === "string") {
            const parts = payload.email.split("@");
            if (parts.length === 2) domain = parts[1].toLowerCase();
          }
          if (domain) params.append("domain", domain);

          // Try to get domainId from JWT first
          domainId = payload?.domainId;
        }

        // Fallback: If domainId not in JWT and we have documentId, try to get it from document
        if (!domainId && documentId) {
          try {
            const { documentService } = await import("@/services/api");
            const doc = await documentService.getById(documentId);
            if (doc?.domainId) {
              domainId = doc.domainId;
              console.log("Retrieved domainId from document:", domainId);
            }
          } catch (docError) {
            console.warn("Could not fetch document to get domainId:", docError);
          }
        }

        // Add domainId to params if we have it
        if (domainId) {
          params.append("domainId", domainId);
        } else {
          console.warn("domainId not found in JWT token or document for summary request");
        }

        // Add workspaceId from localStorage
        const currentWorkspace = localStorage.getItem("currentWorkspace");
        if (currentWorkspace) {
          params.append("workspaceId", currentWorkspace);
        }
      } catch (error) {
        console.error("Error extracting domain/domainId from token:", error);
      }

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
