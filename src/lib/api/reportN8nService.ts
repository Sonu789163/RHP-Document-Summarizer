import axios from "axios";
import { SessionData } from "./sessionService";

const REPORT_N8N_WEBHOOK_URL =
  "https://n8n-excollo.azurewebsites.net/webhook/compare-rhp-drhp";

interface N8nReportResponse {
  executionId?: string;
  status?: string;
  error?: string;
  jobId?: string;
}

export const reportN8nService = {
  async createComparison(
    drhpNamespace: string,
    rhpNamespace: string,
    prompt: string,
    sessionData: SessionData,
    drhpDocumentId?: string,
    rhpDocumentId?: string,
    signal?: AbortSignal
  ): Promise<N8nReportResponse> {
    try {
      const payload: any = {
        drhpNamespace,
        rhpNamespace,
        prompt,
        drhpDocumentId,
        rhpDocumentId,
        sessionId: sessionData.id,
        timestamp: new Date().toISOString(),
        domain: (() => {
          try {
            const token = localStorage.getItem("accessToken");
            if (!token) return undefined;
            const jwt = JSON.parse(atob(token.split(".")[1]));
            return jwt?.domain;
          } catch {
            return undefined;
          }
        })(),
      };

      // Add domainId and workspaceId if available - ALWAYS try to include domainId
      try {
        const token = localStorage.getItem("accessToken");
        if (token) {
          const jwtPayload = JSON.parse(atob(token.split(".")[1]));
          const domainId = jwtPayload?.domainId;
          if (domainId) {
            payload.domainId = domainId;
          } else {
            console.warn("domainId not found in JWT token for report request");
          }
        }
        
        const currentWorkspace = localStorage.getItem("currentWorkspace");
        if (currentWorkspace) {
          payload.workspaceId = currentWorkspace;
        }
      } catch (error) {
        console.error("Error extracting domainId from token:", error);
      }

      const response = await axios.post(REPORT_N8N_WEBHOOK_URL, payload, {
        headers: {
          "Content-Type": "application/json",
        },
        signal,
      });

      return {
        executionId: response.data?.executionId,
        status: response.data?.status,
        jobId: response.data?.jobId,
        error: response.data?.error,
      };
    } catch (error) {
      if (axios.isCancel(error)) {
        return {
          error: "Request was canceled by the user.",
        };
      }
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
