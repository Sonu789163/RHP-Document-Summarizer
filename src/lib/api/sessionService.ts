import { v4 as uuidv4 } from "uuid";

const SESSION_STORAGE_KEY = "chat_session";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export interface SessionData {
  id: string;
  lastActivity: number;
}

export interface ConversationMemory {
  type: "user" | "bot";
  text: string;
  timestamp: number;
}

export interface MemoryContext {
  last_topic: string | null;
  user_interests: string[];
  conversation_summary: string;
}

export const sessionService = {
  initializeSession(): SessionData {
    const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      const now = Date.now();
      if (now - parsed.lastActivity < SESSION_TIMEOUT) {
        return parsed;
      }
    }
    // Create new session with UUID if none exists or is expired
    const newSession = {
      id: `session_${uuidv4()}`,
      lastActivity: Date.now(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    return newSession;
  },

  updateSessionActivity(sessionData: SessionData): SessionData {
    const updated = {
      ...sessionData,
      lastActivity: Date.now(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },

  clearSession(): SessionData {
    const newSession = {
      id: `session_${uuidv4()}`,
      lastActivity: Date.now(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    return newSession;
  },

  isSessionExpired(sessionData: SessionData): boolean {
    return Date.now() - sessionData.lastActivity > SESSION_TIMEOUT;
  },
};
