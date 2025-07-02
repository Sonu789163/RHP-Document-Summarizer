import { chatService } from "../../services/api";

// Chat storage service for localStorage (future: swap to backend)
export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
  documentId: string;
}

const STORAGE_KEY = "doc_chats";

function getAllChats() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveAllChats(data: any) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const chatStorageService = {
  async getChatsForDoc(documentId: string): Promise<ChatSession[]> {
    try {
      const chats = await chatService.getByDocumentId(documentId);
      return Array.isArray(chats) ? chats : [];
    } catch (error) {
      console.error("Error fetching chats:", error);
      return [];
    }
  },

  async getChatById(
    documentId: string,
    chatId: string
  ): Promise<ChatSession | undefined> {
    try {
      const chats = await chatService.getByDocumentId(documentId);
      return Array.isArray(chats)
        ? chats.find((chat) => chat.id === chatId)
        : undefined;
    } catch (error) {
      console.error("Error fetching chat:", error);
      return undefined;
    }
  },

  async saveChatForDoc(documentId: string, chat: ChatSession) {
    try {
      if (chat.id) {
        await chatService.update(chat.id, chat);
      } else {
        const newChat = await chatService.create({
          ...chat,
          documentId,
        });
        chat.id = newChat.id;
      }
    } catch (error) {
      console.error("Error saving chat:", error);
      throw error;
    }
  },

  async listChatsForDoc(documentId: string): Promise<ChatSession[]> {
    return this.getChatsForDoc(documentId);
  },

  async createChatForDoc(
    documentId: string,
    initialMessage: ChatMessage
  ): Promise<ChatSession> {
    const chat: ChatSession = {
      id: Date.now().toString(),
      title:
        initialMessage.content.slice(0, 30) +
        (initialMessage.content.length > 30 ? "..." : ""),
      messages: [initialMessage],
      updatedAt: new Date().toISOString(),
      documentId,
    };

    try {
      const newChat = await chatService.create(chat);
      return newChat;
    } catch (error) {
      console.error("Error creating chat:", error);
      throw error;
    }
  },

  async updateChatTitle(documentId: string, chatId: string, title: string) {
    try {
      const chat = await this.getChatById(documentId, chatId);
      if (chat) {
        chat.title = title;
        chat.updatedAt = new Date().toISOString();
        await this.saveChatForDoc(documentId, chat);
      }
    } catch (error) {
      console.error("Error updating chat title:", error);
      throw error;
    }
  },

  async deleteChatForDoc(documentId: string, chatId: string) {
    try {
      await chatService.delete(chatId);
    } catch (error) {
      console.error("Error deleting chat:", error);
      throw error;
    }
  },
};
