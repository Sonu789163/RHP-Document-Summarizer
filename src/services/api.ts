import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
    microsoftId?: string;
    userId?: string;
  }) {
    const token = localStorage.getItem("accessToken");
    const payload: any = {
      id: document.id,
      name: document.name,
    };
    if (document.namespace) payload.namespace = document.namespace;
    if (document.status) payload.status = document.status;
    if (document.uploadedAt) payload.uploadedAt = document.uploadedAt;
    if (document.file) payload.file = document.file;
    if (document.fileType) payload.fileType = document.fileType;
    if (document.microsoftId) payload.microsoftId = document.microsoftId;
    if (document.userId) payload.userId = document.userId;

    const response = await axios.post(`${API_URL}/documents`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
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
    return response.data;
  },

  async delete(id: string) {
    const token = localStorage.getItem("accessToken");
    const response = await axios.delete(`${API_URL}/documents/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

// Chat Services
export const chatService = {
  getByDocumentId: async (documentId: string) => {
    const response = await axios.get(`${API_URL}/chats/document/${documentId}`);
    return response.data;
  },

  create: async (chat: any) => {
    const response = await axios.post(`${API_URL}/chats`, chat);
    return response.data;
  },

  addMessage: async (chatId: string, message: any) => {
    const response = await axios.post(
      `${API_URL}/chats/${chatId}/messages`,
      message
    );
    return response.data;
  },

  update: async (id: string, chat: any) => {
    const response = await axios.put(`${API_URL}/chats/${id}`, chat);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await axios.delete(`${API_URL}/chats/${id}`);
    return response.data;
  },
};

export interface Summary {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  documentId: string;
  metadata?: {
    pageCount?: number;
    url?: string;
    pdfExpiry?: string;
    duration?: number;
    name?: string;
  };
}

export const summaryService = {
  async getByDocumentId(documentId: string): Promise<Summary[]> {
    const response = await axios.get(
      `${API_URL}/summaries/document/${documentId}`
    );
    return response.data;
  },

  async create(summary: Omit<Summary, "id" | "updatedAt">): Promise<Summary> {
    const response = await axios.post(`${API_URL}/summaries`, summary);
    return response.data;
  },

  async update(id: string, summary: Partial<Summary>): Promise<Summary> {
    const response = await axios.put(`${API_URL}/summaries/${id}`, summary);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await axios.delete(`${API_URL}/summaries/${id}`);
  },
};

export default axios;
