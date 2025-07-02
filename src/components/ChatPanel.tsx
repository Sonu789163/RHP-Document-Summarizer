import React, { useState, useRef, useEffect } from "react";
import { Send, User, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { n8nService } from "@/lib/api/n8nService";
import {
  ConversationMemory,
  MemoryContext,
  SessionData,
  sessionService,
} from "@/lib/api/sessionService";
import {
  chatStorageService,
  ChatSession,
  ChatMessage,
} from "@/lib/api/chatStorageService";
import { toast } from "sonner";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import axios from "axios";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatPanelCustomStyles {
  containerBg?: string;
  inputBg?: string;
  inputBorder?: string;
  sendBtnBg?: string;
  sendBtnIcon?: string;
  userBubble?: string;
  botBubble?: string;
  userText?: string;
  botText?: string;
  timestamp?: string;
  inputRadius?: string;
  inputShadow?: string;
  removeHeader?: boolean;
  removeInputBorder?: boolean;
  inputPlaceholder?: string;
}

interface ChatPanelProps {
  isDocumentProcessed: boolean;
  currentDocument: {
    id: string;
    name: string;
    uploadedAt: string;
    namespace?: string;
  } | null;
  chatId?: string | null;
  onChatCreated?: (chatId: string) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
  customStyles?: ChatPanelCustomStyles;
  newChatTrigger?: number;
}

// Helper function to format bot messages
const formatBotMessage = (content: string): string => {
  if (!content) return "";

  // Split into lines first to handle existing newlines
  const lines = content.split("\n");

  const formattedLines = lines.map((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) return ""; // Keep empty lines

    // Check for bullet points (- , *, +) or numbered list items (1., 2., etc.)
    if (/^[-*+]\s/.test(trimmedLine)) {
      // Replace common bullet point markers with a standard one and keep the rest of the line
      return "•  " + trimmedLine.substring(1).trim();
    } else if (/^\d+\.\s/.test(trimmedLine)) {
      // Keep numbered list items as is
      return trimmedLine;
    } else {
      // For other lines, add a newline after each period followed by a space
      return trimmedLine.replace(/\. \s/g, ".\n");
    }
  });

  // Join processed lines with newlines
  return formattedLines.join("\n");
};

export function ChatPanel({
  isDocumentProcessed,
  currentDocument,
  chatId,
  onChatCreated,
  onProcessingChange,
  customStyles = {},
  newChatTrigger,
}: ChatPanelProps) {
  const [sessionData, setSessionData] = useState<SessionData>(() =>
    sessionService.initializeSession()
  );
  const [conversationMemory, setConversationMemory] = useState<
    ConversationMemory[]
  >([]);
  const [memoryContext, setMemoryContext] = useState<MemoryContext>({
    last_topic: null,
    user_interests: [],
    conversation_summary: "",
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(
    chatId || null
  );
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleNewChat = async () => {
    if (!currentDocument) return;

    const newChat = await chatStorageService.createChatForDoc(
      currentDocument.id,
      {
        id: "initial",
        content: `Hello! I'm your RHP document assistant. Ask a question about ${currentDocument.name} to start a chat.`,
        isUser: false,
        timestamp: new Date().toISOString(),
      }
    );

    const chats = await chatStorageService.getChatsForDoc(currentDocument.id);
    const reloadedChat = chats.find((c) => c.id === newChat.id);

    if (reloadedChat) {
      setMessages(
        reloadedChat.messages.map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }))
      );
      setCurrentChatId(reloadedChat.id);
    }
  };

  useEffect(() => {
    if (newChatTrigger && newChatTrigger > 0) {
      handleNewChat();
    }
  }, [newChatTrigger]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load chat session when chatId or document changes
  useEffect(() => {
    const loadChat = async () => {
      if (!currentDocument) {
        setMessages([]);
        setCurrentChatId(null);
        return;
      }

      try {
        if (chatId) {
          const chats = await chatStorageService.getChatsForDoc(
            currentDocument.id
          );
          const chat = chats.find((c) => c.id === chatId);
          if (chat && Array.isArray(chat.messages)) {
            setMessages(
              chat.messages.map((m) => ({
                ...m,
                timestamp: new Date(m.timestamp),
              }))
            );
            setCurrentChatId(chat.id);
          }
        } else {
          const chats = await chatStorageService.getChatsForDoc(
            currentDocument.id
          );
          if (chats && chats.length > 0 && Array.isArray(chats[0].messages)) {
            setMessages(
              chats[0].messages.map((m) => ({
                ...m,
                timestamp: new Date(m.timestamp),
              }))
            );
            setCurrentChatId(chats[0].id);
          } else {
            setMessages([
              {
                id: "1",
                content:
                  "Hello! I'm your RHP document assistant. Ask a question about it to start a chat.",
                isUser: false,
                timestamp: new Date(),
              },
            ]);
            setCurrentChatId(null);
          }
        }
      } catch (error) {
        console.error("Error loading chat:", error);
        setMessages([]);
        setCurrentChatId(null);
      }
    };

    loadChat();
  }, [currentDocument, chatId]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentDocument) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    let chat: ChatSession | undefined;
    let newChatId = currentChatId;
    let newMessages: Message[] = [];

    try {
      if (!currentChatId) {
        chat = await chatStorageService.createChatForDoc(
          currentDocument.id,
          userMessage
        );
        newChatId = chat.id;
        setCurrentChatId(newChatId);
        if (onChatCreated) onChatCreated(newChatId);
        newMessages = chat.messages.map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      } else {
        const chats = await chatStorageService.getChatsForDoc(
          currentDocument.id
        );
        chat = chats.find((c) => c.id === currentChatId);
        if (chat) {
          chat.messages.push(userMessage);
          chat.updatedAt = new Date().toISOString();
          await chatStorageService.saveChatForDoc(currentDocument.id, chat);
          newMessages = chat.messages.map((m) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
        }
      }

      setMessages(newMessages);
      setInputValue("");
      setIsTyping(true);
      onProcessingChange?.(true);

      // Abort previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const response = await n8nService.sendMessage(
        inputValue,
        sessionData,
        conversationMemory,
        currentDocument.namespace,
        abortControllerRef.current.signal
      );

      // Handle n8n-specific error response
      if (response.error) {
        throw new Error(response.error);
      }

      // Update memory context if provided
      if (response.memory_context) {
        setMemoryContext(response.memory_context);
      }

      // Update conversation memory
      const newUserMessageMemory: ConversationMemory = {
        type: "user",
        text: inputValue,
        timestamp: Date.now(),
      };

      const botResponseText = Array.isArray(response.response)
        ? response.response.join("\n")
        : response.response;

      const newBotMessageMemory: ConversationMemory = {
        type: "bot",
        text: botResponseText,
        timestamp: Date.now(),
      };

      setConversationMemory((prev) => [
        ...prev,
        newUserMessageMemory,
        newBotMessageMemory,
      ]);

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: botResponseText,
        isUser: false,
        timestamp: new Date().toISOString(),
      };

      // Save bot response to chat
      if (currentDocument && newChatId) {
        const chats = await chatStorageService.getChatsForDoc(
          currentDocument.id
        );
        const chat = chats.find((c) => c.id === newChatId);
        if (chat) {
          chat.messages.push(aiResponse);
          chat.updatedAt = new Date().toISOString();
          await chatStorageService.saveChatForDoc(currentDocument.id, chat);
          setMessages(
            chat.messages.map((m) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }))
          );
        }
      }
    } catch (error) {
      console.error("Error in chat:", error);
      const errorMessageContent =
        error instanceof Error
          ? error.message
          : "Sorry, I encountered an error while processing your message.";

      toast.error(errorMessageContent);

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: errorMessageContent,
        isUser: false,
        timestamp: new Date().toISOString(),
      };
      if (currentDocument && newChatId) {
        try {
          const chats = await chatStorageService.getChatsForDoc(
            currentDocument.id
          );
          const chat = chats.find((c) => c.id === newChatId);
          if (chat) {
            chat.messages.push(errorMessage);
            chat.updatedAt = new Date().toISOString();
            await chatStorageService.saveChatForDoc(currentDocument.id, chat);
            setMessages(
              chat.messages.map((m) => ({
                ...m,
                timestamp: new Date(m.timestamp),
              }))
            );
          } else {
            // If chat not found, just add the error message to current messages
            setMessages((prevMessages) => [
              ...prevMessages,
              { ...errorMessage, timestamp: new Date(errorMessage.timestamp) },
            ]);
          }
        } catch (saveError) {
          console.error("Error saving error message:", saveError);
          // If saving fails, just add the error message to current messages without saving
          setMessages((prevMessages) => [
            ...prevMessages,
            { ...errorMessage, timestamp: new Date(errorMessage.timestamp) },
          ]);
        }
      }
    } finally {
      setIsTyping(false);
      onProcessingChange?.(false);
    }
  };

  const handleDownload = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const response = await fetch(
        `https://smart-rhtp-backend-2.onrender.com/api/documents/download/${currentDocument?.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to download file");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = currentDocument?.name || "document.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download failed: " + err.message);
    }
  };

  return (
    <div
      className="flex flex-col flex-1 min-h-0"
      style={{ background: customStyles.containerBg || undefined }}
    >
      {/* Download PDF Button */}
      {currentDocument && (
        <div className="flex items-center justify-end p-2">
          {/* <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-3 py-2 bg-[#4B2A06] text-white rounded hover:bg-[#3A2004] text-sm font-semibold shadow"
            title="Download original PDF"
          >
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-download"
              viewBox="0 0 24 24"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Download PDF
          </button> */}
        </div>
      )}
      {/* Conditionally render header */}
      {!customStyles.removeHeader && (
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <h2 className="font-semibold mt-50 text-lg text-foreground">
            Chat Assistant
          </h2>
        </div>
      )}
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1"
        style={{ background: customStyles.containerBg || undefined }}
      >
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-start gap-3",
                message.isUser ? "justify-end" : "justify-start"
              )}
            >
              {!message.isUser && (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-2xl p-4 max-w-[80%]",
                  message.isUser
                    ? "rounded-br-none"
                    : "rounded-bl-none whitespace-pre-wrap"
                )}
                style={{
                  background: message.isUser
                    ? customStyles.userBubble || "#F3F4F6"
                    : customStyles.botBubble || "#F9F6F2",
                  color: message.isUser
                    ? customStyles.userText || "#232323"
                    : customStyles.botText || "#4B2A06",
                }}
              >
                <p className="text-sm break-words">
                  {message.isUser
                    ? message.content
                    : formatBotMessage(message.content)}
                </p>
                <span
                  className="text-xs opacity-70 block mt-1"
                  style={{ color: customStyles.timestamp || "#A1A1AA" }}
                >
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {message.isUser && (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex max-w-[80%] mr-auto animate-fade-in items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="rounded-2xl p-3 bg-card text-card-foreground">
                <div className="flex space-x-2 items-center">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-pulse delay-150"></div>
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-pulse delay-300"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-4 flex-shrink-0 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              customStyles.inputPlaceholder ||
              "Ask a question about your document..."
            }
            className="flex-1"
            style={{
              background: customStyles.inputBg || undefined,
              borderColor: customStyles.inputBorder || undefined,
              borderRadius: customStyles.inputRadius || undefined,
              boxShadow: customStyles.inputShadow || undefined,
              borderWidth: customStyles.removeInputBorder ? 0 : undefined,
            }}
            disabled={!isDocumentProcessed}
          />
          <Button
            type="submit"
            size="icon"
            style={{
              background: customStyles.sendBtnBg || undefined,
              borderRadius: customStyles.inputRadius || undefined,
              boxShadow: customStyles.inputShadow || undefined,
            }}
            className={cn(
              "text-primary-foreground hover:opacity-90 transition-opacity",
              !isDocumentProcessed && "opacity-50 pointer-events-none"
            )}
            disabled={!isDocumentProcessed}
          >
            {isTyping ? (
              <Loader2
                className="h-4 w-4 animate-spin"
                style={{ color: customStyles.sendBtnIcon || undefined }}
              />
            ) : (
              <Send
                className="h-4 w-4"
                style={{ color: customStyles.sendBtnIcon || undefined }}
              />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function DocumentPopover({
  documentId,
  documentName,
}: {
  documentId: string;
  documentName: string;
}) {
  const [docDetails, setDocDetails] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchDocDetails = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `https://smart-rhtp-backend-2.onrender.com/api/documents/${documentId}`
      );
      setDocDetails(res.data);
    } catch (e) {
      setDocDetails({ text: "Failed to load document details." });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const response = await fetch(
        `https://smart-rhtp-backend-2.onrender.com/api/documents/download/${documentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to download file");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = documentName || "document.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download failed: " + err.message);
    }
  };

  return (
    <Popover
      onOpenChange={(open) => {
        if (open && !docDetails && !loading) fetchDocDetails();
      }}
    >
      <PopoverTrigger asChild>
        <span className="cursor-pointer underline text-base font-semibold text-[#4B2A06] mx-4">
          {documentName}
        </span>
      </PopoverTrigger>
      <PopoverContent className="max-w-lg">
        {loading ? (
          <div>Loading...</div>
        ) : docDetails ? (
          <>
            <div
              className="mb-2 text-sm text-gray-700"
              style={{ maxHeight: 300, overflowY: "auto" }}
            >
              {docDetails.text || "No text extracted."}
            </div>
            <button
              onClick={fetchDocDetails}
              className="inline-block mt-2 px-4 py-2 bg-[#A1A1AA] text-white rounded cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mr-2"
              disabled={!!docDetails.text || loading}
            >
              Fetch Text
            </button>
            <button
              onClick={handleDownload}
              className="inline-block mt-2 px-4 py-2 bg-[#4B2A06] text-white rounded hover:bg-[#3A2004]"
            >
              Download PDF
            </button>
          </>
        ) : (
          <>
            <button
              onClick={fetchDocDetails}
              className="inline-block mt-2 px-4 py-2 bg-[#A1A1AA] text-white rounded cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mr-2"
              disabled={loading}
            >
              Fetch Text
            </button>
            <button
              onClick={handleDownload}
              className="inline-block mt-2 px-4 py-2 bg-[#4B2A06] text-white rounded hover:bg-[#3A2004]"
            >
              Download PDF
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
