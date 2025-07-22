import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { SummaryPanel } from "@/components/SummaryPanel";
import { ChatPanel } from "@/components/ChatPanel";
import { Loader2 } from "lucide-react";
import { uploadService } from "@/lib/api/uploadService";
import { sessionService } from "@/lib/api/sessionService";
import { documentService } from "@/services/api";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "../contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Settings, Plus, Pencil, Edit, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { DocumentPopover } from "@/components/ChatPanel";
import { RhpUploadModal } from "@/components/RhpUploadModal";

export default function ChatSummaryLayout() {
  const { namespace } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentDocument, setCurrentDocument] = useState(null);
  const [selectedSummaryId, setSelectedSummaryId] = useState(null);
  const [isSummaryProcessing, setIsSummaryProcessing] = useState(false);
  const [isInitialDocumentProcessing, setIsInitialDocumentProcessing] =
    useState(true);
  const [sessionData] = useState(() => sessionService.initializeSession());
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newChatTrigger, setNewChatTrigger] = useState(0);
  const { user, logout, isAuthenticated } = useAuth();
  const [summaryWidth, setSummaryWidth] = useState(400); // default width in px
  const minSummaryWidth = 300;
  const maxSummaryWidth = 700;
  const [showRhpModal, setShowRhpModal] = useState(false);
  const [isRhpUploading, setIsRhpUploading] = useState(false);

  const chatId = searchParams.get("chatId");

  useEffect(() => {
    let isMounted = true;
    const fetchAndSetDocument = async () => {
      if (!namespace) {
        if (isMounted) {
          setIsInitialDocumentProcessing(false);
          setCurrentDocument(null);
        }
        return;
      }
      try {
        setIsInitialDocumentProcessing(true);
        const doc = await documentService.getById(namespace);
        if (isMounted) {
          setCurrentDocument(doc);
          setSelectedSummaryId(null);
          setIsSummaryProcessing(false);
          const statusResponse = await uploadService.checkDocumentStatus(
            doc.id,
            sessionData
          );
          if (isMounted) {
            if (statusResponse.status !== "processing") {
              setIsInitialDocumentProcessing(false);
            }
          }
        }
      } catch (error) {
        setCurrentDocument(null);
        setIsInitialDocumentProcessing(false);
      }
    };
    fetchAndSetDocument();
    return () => {
      isMounted = false;
    };
  }, [namespace, sessionData]);

  const handleSelectDocument = (doc) => {
    if (doc) {
      navigate(`/doc/${doc.id}`);
    }
    setSidebarOpen(false);
  };

  const handleNewChat = () => {
    if (!currentDocument) {
      toast.error("Please select a document to start a new chat.");
      return;
    }
    setNewChatTrigger(Date.now());
    setSidebarOpen(false);
  };

  const handleSelectChat = (chat) => {
    if (!chat) return;
    if (!currentDocument || chat.documentId !== currentDocument.id) {
      navigate(`/doc/${chat.documentId}?chatId=${chat.id}`);
    } else {
      setSearchParams({ chatId: chat.id });
    }
    setSidebarOpen(false);
  };

  // Helper for initials
  const getUserInitials = (email) => {
    if (!email) return "U";
    const [name] = email.split("@");
    return name
      .split(".")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!currentDocument && !isInitialDocumentProcessing) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-destructive">
            Document Not Found
          </h2>
          <p className="text-muted-foreground mt-2">
            The document you are looking for does not exist or you may not have
            access.
          </p>
          <button onClick={() => navigate("/upload")} className="mt-4">
            Back to Upload
          </button>
        </div>
      </div>
    );
  }

  if (isInitialDocumentProcessing) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Checking document status...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-row h-screen w-screen bg-[#FAFAFA]">
      {/* Sidebar */}
      <div
        className={`transition-all duration-300 h-full ${
          sidebarOpen ? "w-[15%] min-w-[200px]" : "w-0 min-w-0 max-w-0"
        } bg-white shadow-xl`}
        style={{ overflow: "hidden" }}
      >
        {sidebarOpen && (
          <Sidebar
            selectedDocumentId={currentDocument?.id}
            selectedChatId={chatId}
            onBack={() => setSidebarOpen(false)}
            onSelectDocument={handleSelectDocument}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
          />
        )}
      </div>
      {/* Main Content */}
      <div
        className={`flex flex-col h-full transition-all duration-300 ${
          sidebarOpen ? "w-[90%]" : "w-full"
        }`}
      >
        <Navbar
          onSidebarOpen={() => setSidebarOpen(true)}
          sidebarOpen={sidebarOpen}
          showRhpActions={!!currentDocument}
          hasRhp={!!currentDocument?.relatedRhpId}
          onUploadRhp={() => setShowRhpModal(true)}
          onCompare={() =>
            currentDocument && navigate(`/compare/${currentDocument.id}`)
          }
        />
        <RhpUploadModal
          drhpId={currentDocument?._id}
          drhpName={currentDocument?.name || ""}
          open={showRhpModal}
          onOpenChange={setShowRhpModal}
          onUploadSuccess={() => {
            setShowRhpModal(false);
            if (currentDocument?.id) {
              documentService
                .getById(currentDocument.id)
                .then(setCurrentDocument);
            }
          }}
          setIsUploading={setIsRhpUploading}
        />
        {isRhpUploading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg p-8 flex flex-col items-center shadow-lg">
              <Loader2 className="h-10 w-10 animate-spin mb-4" />
              <span className="text-lg font-semibold">Uploading RHP...</span>
            </div>
          </div>
        )}
        <div className="flex flex-1 w-full h-[calc(100vh-80px)] overflow-hidden">
          {/* Summary Card */}
          <div
            className="flex flex-col bg-white rounded-r-none shadow-xl p-4 h-full justify-stretch"
            style={{
              width: summaryWidth,
              minWidth: minSummaryWidth,
              maxWidth: maxSummaryWidth,
            }}
          >
            <div className="flex-1 overflow-y-auto pr-1 ">
              <SummaryPanel
                isDocumentProcessed={true}
                currentDocument={currentDocument}
                onProcessingChange={setIsSummaryProcessing}
                selectedSummaryId={selectedSummaryId}
                onSummarySelect={setSelectedSummaryId}
              />
            </div>
          </div>
          {/* Divider */}
          <div
            style={{
              width: 4,
              cursor: "col-resize",
              background: "#f1eada",
              zIndex: 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              userSelect: "none", // Prevents text selection
            }}
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startWidth = summaryWidth;
              const onMouseMove = (moveEvent) => {
                const newWidth = Math.min(
                  Math.max(
                    startWidth + moveEvent.clientX - startX,
                    minSummaryWidth
                  ),
                  maxSummaryWidth
                );
                setSummaryWidth(newWidth);
              };
              const onMouseUp = () => {
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
              };
              window.addEventListener("mousemove", onMouseMove);
              window.addEventListener("mouseup", onMouseUp);
            }}
          >
            {/* Drag handle icon (SVG) */}
            <svg width="16" height="32" viewBox="0 0 16 32" fill="none">
              <rect x="4" y="7" width="8" height="2" rx="1" fill="#bfa97a" />
              <rect x="4" y="15" width="8" height="2" rx="1" fill="#bfa97a" />
              <rect x="4" y="23" width="8" height="2" rx="1" fill="#bfa97a" />
            </svg>
          </div>
          {/* Chat Panel (right) */}
          <div className="flex-1 flex flex-col bg-[#fff] px-6 h-full ml-0 rounded-r-2xl rounded-l-none shadow-none justify-stretch">
            <div className="flex flex-col h-full w-full">
              <div className="flex items-center gap-2 mt-4 mb-4 ml-2 justify-between w-full">
                <div className="flex items-center gap-2">
                  <svg
                    width="22"
                    height="22"
                    fill="none"
                    stroke="#232323"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-file-text"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" x2="8" y1="13" y2="13"></line>
                    <line x1="16" x2="8" y1="17" y2="17"></line>
                    <line x1="10" x2="8" y1="9" y2="9"></line>
                  </svg>
                  <DocumentPopover
                    documentId={currentDocument?.id}
                    documentName={
                      currentDocument?.name || currentDocument?.namespace || ""
                    }
                  />
                </div>
                <button
                  className="flex items-center justify-center  rounded-sm px-2 py-2 text-[#4B2A06] shadow-none  transition"
                  style={{
                    fontWeight: 700,
                    fontSize: "1.1rem",
                  }}
                  onClick={handleNewChat}
                  title="New Chat"
                >
                  <Edit className="h-7 w-7 mr-12 text-[#4B2A06]" />
                </button>
              </div>
              <ChatPanel
                isDocumentProcessed={true}
                currentDocument={currentDocument}
                onProcessingChange={setIsSummaryProcessing}
                newChatTrigger={newChatTrigger}
                chatId={chatId}
                customStyles={{
                  containerBg: "#FAFAFA",
                  inputBg: "#fff",
                  inputBorder: "#fff",
                  sendBtnBg: "#4B2A06",
                  sendBtnIcon: "#fff",
                  userBubble: "#F3F4F6",
                  botBubble: "#F9F6F2",
                  userText: "#232323",
                  botText: "#4B2A06",
                  timestamp: "#A1A1AA",
                  inputRadius: "9999px",
                  inputShadow: "0 2px 8px 0 #E5E5E5",
                  removeHeader: true,
                  removeInputBorder: true,
                  inputPlaceholder: "Ask a question about your document...",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
