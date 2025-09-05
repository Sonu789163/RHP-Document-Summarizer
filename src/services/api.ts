import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// Helper function to get user domain from stored user data
const getUserDomain = (): string | null => {
  try {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return null;

    // Decode JWT token to get user info
    const payload = JSON.parse(atob(accessToken.split(".")[1]));
    return payload.domain || null;
  } catch (error) {
    console.error("Error getting user domain:", error);
    return null;
  }
};

// Document Services
export const documentService = {
  async getAll() {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const url = domain
      ? `${API_URL}/documents?domain=${encodeURIComponent(domain)}`
      : `${API_URL}/documents`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getById(id: string) {
    try {
      // First try to get by id
      const token = localStorage.getItem("accessToken");
      const domain = getUserDomain();
      const url = domain
        ? `${API_URL}/documents/${id}?domain=${encodeURIComponent(domain)}`
        : `${API_URL}/documents/${id}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // If not found by id, try to get by namespace
        const allDocs = await this.getAll();
        const doc = allDocs.find((d) => d.namespace === id);
        if (doc) {
          return doc;
        }
      }
      throw error;
    }
  },

  async create(document: {
    id: string;
    name: string;
    namespace?: string;
    status?: string;
    uploadedAt?: string;
    file?: any;
    fileType?: string;
  }) {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const payload: any = {
      id: document.id,
      name: document.name,
      namespace: document.namespace,
      domain: domain, // Include domain in payload
    };
    // if (document.namespace) payload.namespace = document.namespace;
    if (document.status) payload.status = document.status;
    if (document.uploadedAt) payload.uploadedAt = document.uploadedAt;
    if (document.file) payload.file = document.file;
    if (document.fileType) payload.fileType = document.fileType;

    const response = await axios.post(`${API_URL}/documents`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("for namespace:", response);
    return response.data;
  },

  async update(
    id: string,
    document: Partial<{
      status: string;
      name: string;
      namespace: string;
    }>
  ) {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const url = domain
      ? `${API_URL}/documents/${id}?domain=${encodeURIComponent(domain)}`
      : `${API_URL}/documents/${id}`;
    const response = await axios.put(url, document, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("check namespace:", response);
    return response.data;
  },

  async delete(id: string) {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const url = domain
      ? `${API_URL}/documents/${id}?domain=${encodeURIComponent(domain)}`
      : `${API_URL}/documents/${id}`;
    const response = await axios.delete(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async checkExistingByNamespace(namespace: string) {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const url = domain
      ? `${API_URL}/documents/check-existing?namespace=${encodeURIComponent(
          namespace
        )}&domain=${encodeURIComponent(domain)}`
      : `${API_URL}/documents/check-existing?namespace=${encodeURIComponent(
          namespace
        )}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async uploadRhp(file: File, drhpId: string) {
    const token = localStorage.getItem("accessToken");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("drhpId", drhpId);
    formData.append("namespace", file.name.replace(/\.pdf$/i, ""));

    const response = await axios.post(
      `${API_URL}/documents/upload-rhp`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },
};

// Chat Services
export const chatService = {
  // Current user's chats
  getMine: async () => {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const url = domain
      ? `${API_URL}/chats?domain=${encodeURIComponent(domain)}`
      : `${API_URL}/chats`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
  // Admin: get all chats
  getAllAdmin: async () => {
    const token = localStorage.getItem("accessToken");
    const response = await axios.get(`${API_URL}/chats/admin`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // Admin: get chat monitoring stats
  getStats: async (): Promise<{
    totalChats: number;
    chatsPerUser: Array<{
      _id: { microsoftId?: string; userId?: string };
      count: number;
    }>;
    chatsPerDocument: Array<{ _id: string; count: number }>;
    messagesPerChat: Array<{ id: string; count: number; documentId: string }>;
  }> => {
    const token = localStorage.getItem("accessToken");
    const response = await axios.get(`${API_URL}/chats/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // Admin: delete any chat
  deleteAnyAdmin: async (id: string) => {
    const token = localStorage.getItem("accessToken");
    const response = await axios.delete(`${API_URL}/chats/admin/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
  getByDocumentId: async (documentId: string) => {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const url = domain
      ? `${API_URL}/chats/document/${documentId}?domain=${encodeURIComponent(
          domain
        )}`
      : `${API_URL}/chats/document/${documentId}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  create: async (chat: any) => {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const payload = { ...chat, domain }; // Include domain in chat data
    const response = await axios.post(`${API_URL}/chats`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  addMessage: async (chatId: string, message: any) => {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const url = domain
      ? `${API_URL}/chats/${chatId}/messages?domain=${encodeURIComponent(
          domain
        )}`
      : `${API_URL}/chats/${chatId}/messages`;
    const response = await axios.post(url, message, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  update: async (id: string, chat: any) => {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const url = domain
      ? `${API_URL}/chats/${id}?domain=${encodeURIComponent(domain)}`
      : `${API_URL}/chats/${id}`;
    const response = await axios.put(url, chat, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  delete: async (id: string) => {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const url = domain
      ? `${API_URL}/chats/${id}?domain=${encodeURIComponent(domain)}`
      : `${API_URL}/chats/${id}`;
    const response = await axios.delete(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

export interface Summary {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  documentId: string;
  userId?: string;
  microsoftId?: string;
}

export interface Report {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  drhpId: string;
  rhpId: string;
  drhpNamespace: string;
  rhpNamespace: string;
  userId?: string;
  microsoftId?: string;
}

export const reportService = {
  async getAll(): Promise<Report[]> {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const url = domain
      ? `${API_URL}/reports?domain=${encodeURIComponent(domain)}`
      : `${API_URL}/reports`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getById(id: string): Promise<Report> {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const url = domain
      ? `${API_URL}/reports/${id}?domain=${encodeURIComponent(domain)}`
      : `${API_URL}/reports/${id}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async createComparison(
    drhpNamespace: string,
    rhpNamespace: string,
    prompt?: string
  ): Promise<{ jobId: string; report: Report; reportId: string }> {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const payload = {
      drhpNamespace,
      rhpNamespace,
      domain, // Include domain in payload
      prompt:
        prompt || "Compare these documents and provide a detailed analysis",
    };
    const response = await axios.post(
      `${API_URL}/reports/create-report`,
      payload,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  async create(report: Omit<Report, "id" | "updatedAt">): Promise<Report> {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const payload = { ...report, domain }; // Include domain in payload
    const response = await axios.post(`${API_URL}/reports`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async update(id: string, report: Partial<Report>): Promise<Report> {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const url = domain
      ? `${API_URL}/reports/${id}?domain=${encodeURIComponent(domain)}`
      : `${API_URL}/reports/${id}`;
    const response = await axios.put(url, report, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const url = domain
      ? `${API_URL}/reports/${id}?domain=${encodeURIComponent(domain)}`
      : `${API_URL}/reports/${id}`;
    try {
      await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // If the report doesn't exist, treat as successfully deleted
        return;
      }
      throw error;
    }
  },

  async downloadPdf(id: string): Promise<Blob> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.get(
      `${API_URL}/reports/${id}/download-html-pdf`,
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      }
    );
    return response.data;
  },

  async downloadDocx(id: string): Promise<Blob> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.get(`${API_URL}/reports/${id}/download-docx`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "blob",
    });
    return response.data;
  },

  async downloadHtmlPdf(id: string): Promise<Blob> {
    console.log("downloading html pdf", id);
    const token = localStorage.getItem("accessToken");
    const response = await axios.get(
      `${API_URL}/reports/${id}/download-html-pdf`,
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      }
    );
    return response.data;
  },
};

export const summaryService = {
  async getAll(): Promise<Summary[]> {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const url = domain
      ? `${API_URL}/summaries?domain=${encodeURIComponent(domain)}`
      : `${API_URL}/summaries`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getByDocumentId(documentId: string): Promise<Summary[]> {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const url = domain
      ? `${API_URL}/summaries/document/${documentId}?domain=${encodeURIComponent(
          domain
        )}`
      : `${API_URL}/summaries/document/${documentId}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async create(summary: Omit<Summary, "id" | "updatedAt">): Promise<Summary> {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const payload = { ...summary, domain }; // Include domain in payload
    const response = await axios.post(`${API_URL}/summaries`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async update(id: string, summary: Partial<Summary>): Promise<Summary> {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const url = domain
      ? `${API_URL}/summaries/${id}?domain=${encodeURIComponent(domain)}`
      : `${API_URL}/summaries/${id}`;
    const response = await axios.put(url, summary, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    const token = localStorage.getItem("accessToken");
    const domain = getUserDomain();
    const url = domain
      ? `${API_URL}/summaries/${id}?domain=${encodeURIComponent(domain)}`
      : `${API_URL}/summaries/${id}`;
    await axios.delete(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async downloadDocx(id: string): Promise<Blob> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.get(
      `${API_URL}/summaries/${id}/download-docx`,
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      }
    );
    return response.data;
  },

  async downloadHtmlPdf(id: string): Promise<Blob> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.get(
      `${API_URL}/summaries/${id}/download-html-pdf`,
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      }
    );
    console.log("downloading html pdf", response);
    return response.data;
  },
};

// OpenAI Monitoring Services
// OpenAI monitoring removed

export default axios;
