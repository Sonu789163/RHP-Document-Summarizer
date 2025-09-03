import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// Document Services
export const documentService = {
  async getAll() {
    const token = localStorage.getItem("accessToken");
    const response = await axios.get(`${API_URL}/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getById(id: string) {
    try {
      // First try to get by id
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(`${API_URL}/documents/${id}`, {
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
    const payload: any = {
      id: document.id,
      name: document.name,
      namespace: document.namespace,
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
    const response = await axios.put(`${API_URL}/documents/${id}`, document, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("check namespace:", response);
    return response.data;
  },

  async delete(id: string) {
    const token = localStorage.getItem("accessToken");
    const response = await axios.delete(`${API_URL}/documents/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async checkExistingByNamespace(namespace: string) {
    const token = localStorage.getItem("accessToken");
    const response = await axios.get(
      `${API_URL}/documents/check-existing?namespace=${encodeURIComponent(
        namespace
      )}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
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
    const response = await axios.get(`${API_URL}/chats`, {
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
    const response = await axios.get(
      `${API_URL}/chats/document/${documentId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  create: async (chat: any) => {
    const token = localStorage.getItem("accessToken");
    const response = await axios.post(`${API_URL}/chats`, chat, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  addMessage: async (chatId: string, message: any) => {
    const token = localStorage.getItem("accessToken");
    const response = await axios.post(
      `${API_URL}/chats/${chatId}/messages`,
      message,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  update: async (id: string, chat: any) => {
    const token = localStorage.getItem("accessToken");
    const response = await axios.put(`${API_URL}/chats/${id}`, chat, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  delete: async (id: string) => {
    const token = localStorage.getItem("accessToken");
    const response = await axios.delete(`${API_URL}/chats/${id}`, {
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
    const response = await axios.get(`${API_URL}/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getById(id: string): Promise<Report> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.get(`${API_URL}/reports/${id}`, {
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
    const response = await axios.post(
      `${API_URL}/reports/create-report`,
      {
        drhpNamespace,
        rhpNamespace,
        prompt:
          prompt || "Compare these documents and provide a detailed analysis",
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  async create(report: Omit<Report, "id" | "updatedAt">): Promise<Report> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.post(`${API_URL}/reports`, report, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async update(id: string, report: Partial<Report>): Promise<Report> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.put(`${API_URL}/reports/${id}`, report, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    const token = localStorage.getItem("accessToken");
    try {
      await axios.delete(`${API_URL}/reports/${id}`, {
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
    const response = await axios.get(`${API_URL}/reports/${id}/download-pdf`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "blob",
    });
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
    const response = await axios.get(`${API_URL}/summaries`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getByDocumentId(documentId: string): Promise<Summary[]> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.get(
      `${API_URL}/summaries/document/${documentId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async create(summary: Omit<Summary, "id" | "updatedAt">): Promise<Summary> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.post(`${API_URL}/summaries`, summary, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async update(id: string, summary: Partial<Summary>): Promise<Summary> {
    const token = localStorage.getItem("accessToken");
    const response = await axios.put(`${API_URL}/summaries/${id}`, summary, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    const token = localStorage.getItem("accessToken");
    await axios.delete(`${API_URL}/summaries/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
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
