import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Upload,
  Calendar,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Pencil,
  X,
  Star,
  BarChart3,
  Users,
  Globe,
  Shield,
  ArrowLeft,
  Plus,
  List,
  Grid3X3,
  Folder as FolderIcon,
  ChevronDown,
  Share,
  Share2,
  GitCompare,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { documentService } from "@/services/api";
import { uploadService } from "@/lib/api/uploadService";
import { sessionService } from "@/lib/api/sessionService";
import { toast } from "sonner";
import { useRefreshProtection } from "../hooks/useRefreshProtection";
import { Navbar } from "./Navbar";
import { RhpUploadModal } from "./RhpUploadModal";
import { Sidebar } from "./Sidebar";
import { FolderSidebar } from "./FolderSidebar";
import { directoryService, shareService } from "@/services/api";
import { ShareDialog } from "./ShareDialog";
import MoveDocumentDialog from "./MoveDocumentDialog";
import { CompareDocumentModal } from "./CompareDocumentModal";

export const StartConversation: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout, isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sessionData] = useState(() => sessionService.initializeSession());
  const [docToDelete, setDocToDelete] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState<any>(null);
  const [highlightedDocId, setHighlightedDocId] = useState<string | null>(null);
  const docRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [currentFolder, setCurrentFolder] = useState<{
    id: string | null;
    name: string;
  } | null>(null);
  const [shareDocId, setShareDocId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [showTimeFilter, setShowTimeFilter] = useState(false);
  const [isDateRangeApplied, setIsDateRangeApplied] = useState(false);
  const [movingDocId, setMovingDocId] = useState<string | null>(null);
  const [movingDocDirectoryId, setMovingDocDirectoryId] = useState<
    string | null
  >(null);
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("DRHP");
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);
  const [selectedUploadType, setSelectedUploadType] = useState<string>("");
  const [showRhpUploadModal, setShowRhpUploadModal] = useState(false);
  const [rhpFile, setRhpFile] = useState<File | null>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [selectedDocumentForCompare, setSelectedDocumentForCompare] = useState<any>(null);
  const [availableDocumentsForCompare, setAvailableDocumentsForCompare] = useState<any[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);

  useRefreshProtection(
    isUploading,
    "A file is currently uploading. Please wait."
  );

  // Socket event handling for upload status
  useEffect(() => {
    const handleUploadStatus = (data: {
      jobId: string;
      status: string;
      error?: string;
    }) => {
      if (data.status === "failed") {
        toast.error(`Upload failed: ${data.error || "Unknown error"}`);
      } else if (data.status === "completed") {
        toast.success("Upload completed successfully!");
        fetchDocuments(); // Refresh the document list
      }
    };

    // Listen for socket events (if socket is available)
    if (window.io) {
      window.io.on("upload_status", handleUploadStatus);
      return () => {
        window.io.off("upload_status", handleUploadStatus);
      };
    }
  }, []);

  // Helper for initials
  const getUserInitials = (email: string) => {
    if (!email) return "U";
    const [name] = email.split("@");
    return name
      .split(".")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const fetchDocuments = () => {
    setLoading(true);
    setError(null);
    // If a shared link is active but the URL no longer has ?linkToken,
    // keep showing the shared resource on the dashboard.
    const persistedToken = localStorage.getItem("sharedLinkToken");
    const urlToken = searchParams.get("linkToken");
    if (persistedToken && !urlToken) {
      (async () => {
        try {
          const link = await shareService.resolveLink(persistedToken);
          if (link?.resourceType === "document") {
            const doc = await documentService.getById(
              link.resourceId,
              persistedToken
            );
            setDocuments(doc ? [doc] : []);
            setLoading(false);
            return;
          }
        } catch {}
        // Fallback to normal listing if resolve fails
        documentService
          .getAll({ directoryId: currentFolder?.id ?? "root" })
          .then((docs) => {
            let filteredDocs = docs || [];
            
            // Apply document type filter only in root folder
            if (!currentFolder) {
              if (documentTypeFilter === "DRHP") {
                filteredDocs = filteredDocs.filter((d: any) => d?.type === "DRHP");
              } else if (documentTypeFilter === "RHP") {
                filteredDocs = filteredDocs.filter((d: any) => d?.type === "RHP");
              }
            }
            
            setDocuments(filteredDocs);
            setLoading(false);
          })
          .catch(() => {
            setError("Failed to load documents");
            setLoading(false);
          });
      })();
      return;
    }

    documentService
      .getAll({ directoryId: currentFolder?.id ?? "root" })
      .then((docs) => {
        let filteredDocs = docs || [];
        
        // Apply document type filter only in root folder
        if (!currentFolder) {
          if (documentTypeFilter === "DRHP") {
            filteredDocs = filteredDocs.filter((d: any) => d?.type === "DRHP");
          } else if (documentTypeFilter === "RHP") {
            filteredDocs = filteredDocs.filter((d: any) => d?.type === "RHP");
          }
        }
        
        setDocuments(filteredDocs);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load documents");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDocuments();
  }, [currentFolder?.id, documentTypeFilter]);

  // Handle link token from URL
  useEffect(() => {
    const linkToken = searchParams.get("linkToken");
    if (linkToken) {
      // Persist for long-lived access across navigation and reloads
      localStorage.setItem("sharedLinkToken", linkToken);
      handleLinkToken(linkToken);
    }
  }, [searchParams]);

  const handleLinkToken = async (token: string) => {
    try {
      setLoading(true);
      const linkData = await shareService.resolveLink(token);

      if (linkData.resourceType === "document") {
        // Option A: navigate directly to document view
        // navigate(`/doc/${linkData.resourceId}?linkToken=${token}`);

        // Option B (preferred for your request): show the shared doc on dashboard
        const doc = await documentService.getById(linkData.resourceId, token);
        setCurrentFolder(null);
        setDocuments(doc ? [doc] : []);
        toast.success("You have access to a shared document");
      } else if (linkData.resourceType === "directory") {
        // Set the current folder to the shared directory
        setCurrentFolder({ id: linkData.resourceId, name: "Shared Folder" });
        toast.success("Accessing shared folder...");
      }
    } catch (error) {
      console.error("Error resolving link token:", error);
      toast.error("Invalid or expired share link");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0], selectedUploadType);
    }
  };

  const handleCompareClick = async (document: any) => {
    try {
      setCompareLoading(true);
      setSelectedDocumentForCompare(document);
      
      const response = await documentService.getAvailableForCompare(document.id);
      setAvailableDocumentsForCompare(response.availableDocuments);
      setShowCompareModal(true);
    } catch (error) {
      console.error("Error fetching available documents:", error);
      toast.error("Failed to load documents for comparison");
    } finally {
      setCompareLoading(false);
    }
  };

  const handleDocumentSelection = async (selectedDoc: any, targetDoc: any) => {
    try {
      setCompareLoading(true);
      
      // Link the documents
      await documentService.linkForCompare(selectedDoc.id, targetDoc.id);
      
      // Close modal
      setShowCompareModal(false);
      setSelectedDocumentForCompare(null);
      setAvailableDocumentsForCompare([]);
      
      // Navigate to compare page
      navigate(`/compare/${selectedDoc.id}`);
      
      toast.success("Documents linked successfully! Redirecting to comparison...");
    } catch (error) {
      console.error("Error linking documents:", error);
      toast.error("Failed to link documents for comparison");
    } finally {
      setCompareLoading(false);
    }
  };

  const handleUpload = async (file: File, uploadType: string = "DRHP") => {
    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }

    // Fast client-side duplicate guard by namespace (using exact names)
    const localNamespace = file.name.toLowerCase();
    const localDup = (documents || []).find(
      (d: any) => d?.namespace?.toLowerCase() === localNamespace
    );
    if (localDup) {
      setHighlightedDocId(localDup.id);
      setTimeout(() => {
        const ref = docRefs.current[localDup.id];
        if (ref) ref.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
      toast(
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span>
            Document "{localDup.name}" already exists and is highlighted below.
          </span>
        </div>,
        { duration: 4000 }
      );
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(
      <div className="flex items-center gap-2">
        <span>Checking {file.name}...</span>
      </div>
    );

    try {
      // 1) Check by namespace first
      const existing = await uploadService.checkExistingDocument(file.name);
      if (existing.exists && existing.document) {
        toast.dismiss(toastId);
        setHighlightedDocId(existing.document.id);
        // ensure doc list is present
        if (!documents?.length) await fetchDocuments();
        setTimeout(() => {
          const ref = docRefs.current[existing.document.id];
          if (ref) ref.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 200);
        toast(
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span>
              Document "{existing.document.name}" already exists and is
              highlighted below.
            </span>
          </div>,
          { duration: 4000 }
        );
        return;
      }

      // 2) Not found: proceed to upload
      const token = localStorage.getItem("accessToken");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("namespace", file.name); // Use exact filename with .pdf extension
      if (currentFolder?.id) formData.append("directoryId", currentFolder.id);
      
      // Choose the correct upload endpoint based on document type
      const uploadEndpoint = uploadType === "RHP" 
        ? `${import.meta.env.VITE_API_URL}/documents/upload-rhp`
        : `${import.meta.env.VITE_API_URL}/documents/upload`;
      
      const res = await fetch(uploadEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      let response = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Backend duplicate safety
          toast.dismiss(toastId);
          setHighlightedDocId(response?.existingDocument?.id);
          setTimeout(() => {
            const ref = docRefs.current[response?.existingDocument?.id];
            if (ref)
              ref.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 200);
          toast(
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>
                Document "{response?.existingDocument?.name}" already exists and
                is highlighted below.
              </span>
            </div>,
            { duration: 4000 }
          );
          return;
        }
        throw new Error(response?.error || "Failed to upload file to backend");
      }

      // Check if document already exists
      if (response && response.existingDocument) {
        toast.dismiss(toastId);
        setHighlightedDocId(response.existingDocument.id);
        // Scroll to the highlighted document after a short delay
        setTimeout(() => {
          const ref = docRefs.current[response.existingDocument.id];
          if (ref) {
            ref.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 200);
        toast(
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive " />
            <span>
              Document "{response.existingDocument.name}" already exists and is
              highlighted below.
            </span>
          </div>,
          { duration: 4000 }
        );
        return;
      }

      if (!response || !response.document) {
        throw new Error(response?.error || "Upload failed");
      }
      console.log("file response:", response);

      // Show modal instead of toast
      setUploadedDoc(response.document);
      setShowSuccessModal(true);
      toast.dismiss(toastId);
      fetchDocuments(); // Refresh the document list
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span>
            {error instanceof Error ? error.message : "Upload failed"}
          </span>
        </div>,
        {
          id: toastId,
          duration: 4000,
        }
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Filter documents by date range and search
  const filteredDocs = documents.filter((doc) => {
    if (search && !doc.name.toLowerCase().includes(search.toLowerCase()))
      return false;

    // Handle different date formats
    let docDate: Date;
    if (doc.uploadedAt) {
      docDate = new Date(doc.uploadedAt);
    } else if (doc.date) {
      docDate = new Date(doc.date);
    } else {
      // If no date, skip time filtering
      return true;
    }

    // Check if date is valid
    if (isNaN(docDate.getTime())) {
      return true; // Skip invalid dates
    }

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && docDate < start) return false;
    if (end && docDate > end) return false;

    // Apply time filter
    if (timeFilter !== "all") {
      const now = new Date();
      let filterStart: Date;

      switch (timeFilter) {
        case "today":
          filterStart = new Date();
          filterStart.setHours(0, 0, 0, 0);
          break;
        case "last7":
          filterStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "last15":
          filterStart = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
          break;
        case "last30":
          filterStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          return true;
      }

      // Debug logging
      console.log(
        `Filter: ${timeFilter}, Filter Start: ${filterStart.toLocaleDateString()}, Doc Date: ${docDate.toLocaleDateString()}, Doc Name: ${
          doc.name
        }, Pass: ${docDate >= filterStart}`
      );

      if (docDate < filterStart) return false;
    }

    return true;
  });

  const handleDeleteDoc = async (doc: any) => {
    setDocToDelete(doc);
    setShowDeleteDialog(true);
  };

  const confirmDeleteDoc = async () => {
    if (!docToDelete) return;
    try {
      await documentService.delete(docToDelete.id);
      toast.success("Document deleted successfully");
      fetchDocuments();
    } catch (error) {
      toast.error("Failed to delete document");
    } finally {
      setShowDeleteDialog(false);
      setDocToDelete(null);
    }
  };

  const handleRenameClick = (doc: any) => {
    setRenamingDocId(doc.id);
    setRenameValue(doc.name);
  };

  const handleRenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRenameValue(e.target.value);
  };

  const handleRenameSubmit = async (doc: any) => {
    if (!renameValue.trim() || renameValue === doc.name) {
      setRenamingDocId(null);
      return;
    }
    try {
      await documentService.update(doc.id, { name: renameValue.trim() });
      toast.success("Document renamed successfully");
      fetchDocuments();
    } catch (error) {
      toast.error("Failed to rename document");
    } finally {
      setRenamingDocId(null);
    }
  };

  const handleRenameKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    doc: any
  ) => {
    if (e.key === "Enter") {
      handleRenameSubmit(doc);
    } else if (e.key === "Escape") {
      setRenamingDocId(null);
    }
  };

  const openMoveDialog = (doc: any) => {
    setMovingDocId(doc.id);
    setMovingDocDirectoryId(doc.directoryId ?? null);
  };

  const handleMoveSelect = async (destDirectoryId: string | null) => {
    if (!movingDocId) return;
    await documentService.update(movingDocId, { directoryId: destDirectoryId });
    setMovingDocId(null);
    setMovingDocDirectoryId(null);
    fetchDocuments();
  };

  const handleNavigateToExisting = () => {
    if (uploadedDoc) {
      navigate(`/doc/${uploadedDoc.namespace || uploadedDoc.id}`);
      setShowSuccessModal(false);
      setUploadedDoc(null);
    }
  };

  const handleCloseExistingModal = () => {
    setShowSuccessModal(false);
    setUploadedDoc(null);
  };

  // Sidebar handlers
  const handleSidebarBack = () => {
    navigate("/dashboard");
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  const handleSelectDocument = (doc: any) => {
    if (doc) {
      navigate(`/doc/${doc.id}`);
    }
    setSidebarOpen(false);
  };

  const handleSelectChat = (chat: any) => {
    if (chat) {
      navigate(`/doc/${chat.documentId}?chatId=${chat.id}`);
    }
    setSidebarOpen(false);
  };

  const handleNewChat = () => {
    setSidebarOpen(false);
  };

  const handleDateRangeApply = () => {
    if (startDate || endDate) {
      setIsDateRangeApplied(true);
    }
    setShowDatePicker(false);
  };

  const handleDateRangeClear = () => {
    setStartDate("");
    setEndDate("");
    setIsDateRangeApplied(false);
  };

  // Handle click outside to close sidebar and time filter
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarOpen) {
        const sidebar = document.querySelector('[data-sidebar="true"]');
        const hamburger = document.querySelector('[data-hamburger="true"]');

        if (
          sidebar &&
          !sidebar.contains(event.target as Node) &&
          hamburger &&
          !hamburger.contains(event.target as Node)
        ) {
          setSidebarOpen(false);
        }
      }

      if (showTimeFilter) {
        const timeFilterButton = document.querySelector(
          '[data-time-filter="true"]'
        );
        if (
          timeFilterButton &&
          !timeFilterButton.contains(event.target as Node)
        ) {
          setShowTimeFilter(false);
        }
      }


      if (showUploadDropdown) {
        const uploadDropdown = document.querySelector(
          '[data-upload-dropdown="true"]'
        );
        if (
          uploadDropdown &&
          !uploadDropdown.contains(event.target as Node)
        ) {
          setShowUploadDropdown(false);
        }
      }
    };

    if (sidebarOpen || showTimeFilter || showUploadDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sidebarOpen, showTimeFilter, showUploadDropdown]);

  return (
    <div
      className="min-h-screen bg-white flex flex-col font-sans"
      style={{ fontFamily: "Inter, Arial, sans-serif" }}
    >
      {/* Top navbar full width */}
      <Navbar
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        onSidebarOpen={() => setSidebarOpen(true)}
        sidebarOpen={sidebarOpen}
      />

      {/* Bottom split: left sidebar, right content */}
      <div className="flex-1 flex flex-row min-w-0">
        {/* Static left sidebar for Folders */}
        <FolderSidebar
          onFolderOpen={(folder) =>
            setCurrentFolder({ id: folder.id, name: folder.name })
          }
          onFolderDeleted={() => {
            setCurrentFolder(null);
            fetchDocuments();
          }}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Sidebar */}
          <div
            className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 ${
              sidebarOpen ? "w-[15%] min-w-[200px]" : "w-0 min-w-0 max-w-0"
            } bg-white shadow-xl`}
            style={{ overflow: "hidden" }}
            data-sidebar="true"
          >
            {sidebarOpen && (
              <div className="h-full flex flex-col">
                {/* Top Navigation Bar */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <button
                    onClick={handleSidebarBack}
                    className="flex items-center gap-2 text-[#7C7C7C] hover:text-[#4B2A06] transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    <span className="text-sm font-medium">Back</span>
                  </button>
                  <button
                    onClick={handleSidebarClose}
                    className="text-[#7C7C7C] hover:text-[#4B2A06] transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* New Chat Button */}
                <div className="p-4">
                  <button
                    className="w-full flex items-center justify-between bg-[#ECE9E2] rounded-2xl px-5 py-4 text-[#4B2A06] text-[1.1rem] font-bold shadow-none border-none hover:bg-[#E0D7CE] transition"
                    style={{
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      borderRadius: "18px",
                    }}
                    onClick={handleNewChat}
                  >
                    <span>New Chat</span>
                    <Plus className="h-7 w-7 text-[#4B2A06]" />
                  </button>
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 overflow-hidden">
                  <Sidebar
                    selectedDocumentId={null}
                    selectedChatId={null}
                    onBack={handleSidebarBack}
                    onClose={handleSidebarClose}
                    onSelectDocument={handleSelectDocument}
                    onSelectChat={handleSelectChat}
                    onNewChat={handleNewChat}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <main
            className={`flex-1 flex flex-col pt-[1.5vw] pr-[1.5vw] pb-[4vh] relative max-w-[77vw] mx-auto w-full min-h-0 transition-all duration-300 ${
              sidebarOpen ? "ml-[15%] max-w-[77vw]" : ""
            }`}
          >
            {/* Header Section with Title and Upload Button */}
            <div className="flex flex-col space-y-[1.5vw] mb-[1.5vw]">
              {/* Title and Admin Navigation Row */}
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  {/* <h1
                className="text-5xl font-extrabold"
                style={{
                  color: "#232323",
                  fontFamily: "Inter, Arial, sans-serif",
                }}
              >
                Start New <span style={{ color: "#FF7A1A" }}>Conversation</span>
               
              </h1> */}

                  {/* Admin Navigation Links */}
                  {user?.role === "admin" && (
                    <div className="flex gap-[1vw]">
                      <button
                        onClick={() => navigate("/admin")}
                        className="flex items-center gap-[0.5vw] bg-[#4B2A06] text-white font-semibold px-[1.5vw] py-[0.5vw] rounded-lg text-lg hover:bg-[#3A2004] transition-colors"
                      >
                        <Shield className="h-5 w-5" />
                        Admin Dashboard
                      </button>
                      <button
                        onClick={() => navigate("/admin/users")}
                        className="flex items-center gap-[0.5vw] bg-[#FF7A1A] text-white font-semibold px-[1.5vw] py-[0.5vw] rounded-lg text-lg hover:bg-[#E56A0A] transition-colors"
                      >
                        <Users className="h-5 w-5" />
                        User Management
                      </button>
                    </div>
                  )}
                </div>

                {/* Upload Button with Dropdown */}
                <div className="flex flex-col items-end relative">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf"
                    className="hidden outline-none"
                    disabled={isUploading}
                  />
                  <div className="relative">
                    <button
                      className="flex items-center gap-[0.5vw] bg-[#4B2A06] text-white font-semibold px-4 py-2 rounded-lg shadow-lg text-lg transition hover:bg-[#3A2004] focus:outline-none"
                      onClick={() => setShowUploadDropdown(!showUploadDropdown)}
                      disabled={isUploading}
                      title="Choose document type to upload"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-[1.5vw] w-[1.5vw] min-w-[24px] min-h-[24px] animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Upload Document
                          <ChevronDown className="h-4 w-4" />
                        </>
                      )}
                    </button>
                    
                    {showUploadDropdown && !isUploading && (
                      <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px]" data-upload-dropdown="true">
                        <button
                          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => {
                            setSelectedUploadType("DRHP");
                            setShowUploadDropdown(false);
                            fileInputRef.current?.click();
                          }}
                        >
                          <FileText className="h-4 w-4 text-[#4B2A06]" />
                          <div>
                            <div className="font-medium">Upload DRHP</div>
                            <div className="text-xs text-gray-500">Draft Red Herring Prospectus</div>
                          </div>
                        </button>
                        <button
                          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                          onClick={() => {
                            setSelectedUploadType("RHP");
                            setShowUploadDropdown(false);
                            setShowRhpUploadModal(true);
                          }}
                        >
                          <FileText className="h-4 w-4 text-[#FF7A1A]" />
                          <div>
                            <div className="font-medium">Upload RHP</div>
                            <div className="text-xs text-gray-500">Red Herring Prospectus</div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Filters and Search */}
            <div className="flex justify-between items-center mb-[2vw]">
              <div className="flex items-center gap-4">
                {/* Document Type Segmented Control - Only show in root folder */}
                {!currentFolder && (
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        documentTypeFilter === "DRHP"
                          ? "bg-white text-[#4B2A06] shadow-sm"
                          : "text-gray-600 hover:text-gray-800"
                      }`}
                      onClick={() => setDocumentTypeFilter("DRHP")}
                      type="button"
                    >
                      <FileText className="h-4 w-4" />
                      DRHP
                    </button>
                    <button
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        documentTypeFilter === "RHP"
                          ? "bg-white text-[#4B2A06] shadow-sm"
                          : "text-gray-600 hover:text-gray-800"
                      }`}
                      onClick={() => setDocumentTypeFilter("RHP")}
                      type="button"
                    >
                      <FileText className="h-4 w-4" />
                      RHP
                    </button>
                  </div>
                )}
                {/* <div className="relative">
              <button 
                className="flex items-center gap-[0.5vw] bg-[#F3F4F6] text-[#5A6473] font-semibold px-[1.5vw] py-[0.5vw] rounded-lg text-base hover:bg-[#E5E7EB] transition-colors"
                onClick={() => setShowTimeFilter(!showTimeFilter)}
                data-time-filter="true"
              >
                {timeFilter === 'all' ? 'All Files' : 
                 timeFilter === 'today' ? 'Today' :
                 timeFilter === 'last7' ? 'Last 7 days' :
                 timeFilter === 'last15' ? 'Last 15 days' :
                 timeFilter === 'last30' ? 'Last 30 days' : 'All Files'}
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {showTimeFilter && (
                <div className="absolute left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[160px]">
                  <button
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                      timeFilter === 'all' ? 'bg-gray-50 text-[#4B2A06]' : 'text-gray-700'
                    }`}
                    onClick={() => {
                      setTimeFilter('all');
                      setShowTimeFilter(false);
                    }}
                  >
                    All Files
                  </button>
                  <button
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                      timeFilter === 'today' ? 'bg-gray-50 text-[#4B2A06]' : 'text-gray-700'
                    }`}
                    onClick={() => {
                      setTimeFilter('today');
                      setShowTimeFilter(false);
                    }}
                  >
                    Today
                  </button>
                  <button
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                      timeFilter === 'last7' ? 'bg-gray-50 text-[#4B2A06]' : 'text-gray-700'
                    }`}
                    onClick={() => {
                      setTimeFilter('last7');
                      setShowTimeFilter(false);
                    }}
                  >
                    Last 7 days
                  </button>
                  <button
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                      timeFilter === 'last15' ? 'bg-gray-50 text-[#4B2A06]' : 'text-gray-700'
                    }`}
                    onClick={() => {
                      setTimeFilter('last15');
                      setShowTimeFilter(false);
                    }}
                  >
                    Last 15 days
                  </button>
                  <button
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                      timeFilter === 'last30' ? 'bg-gray-50 text-[#4B2A06]' : 'text-gray-700'
                    }`}
                    onClick={() => {
                      setTimeFilter('last30');
                      setShowTimeFilter(false);
                    }}
                  >
                    Last 30 days
                  </button>
                </div>
              )}
            </div> */}
                <div className="relative mr-[0.5vw]">
                  <button
                    className={`flex items-center gap-[0.5vw] font-semibold px-[1.5vw] py-[0.5vw] rounded-lg text-base transition-colors ${
                      isDateRangeApplied
                        ? "bg-[#4B2A06] text-white hover:bg-[#3A2004]"
                        : "bg-[#F3F4F6] text-[#5A6473] hover:bg-[#E5E7EB]"
                    }`}
                    onClick={() => setShowDatePicker((v) => !v)}
                    type="button"
                  >
                    {isDateRangeApplied ? (
                      <>
                        {startDate && endDate
                          ? `${startDate} - ${endDate}`
                          : startDate
                          ? `From ${startDate}`
                          : endDate
                          ? `Until ${endDate}`
                          : "Date Range"}
                        <X
                          className="h-[0.8vw] w-[0.8vw] min-w-[12px] min-h-[12px] ml-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDateRangeClear();
                          }}
                        />
                      </>
                    ) : (
                      <>
                        Date Range{" "}
                        <Calendar className="h-[1vw] w-[1vw] min-w-[16px] min-h-[16px]" />
                      </>
                    )}
                  </button>
                  {showDatePicker && (
                    <div className="absolute left-0 mt-[0.5vw] bg-white border border-[#E5E5E5] rounded-lg shadow-lg p-[1vw] flex gap-[1vw] z-20">
                      <div className="flex flex-col">
                        <label className="text-xs mb-1 text-[#232323]">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="border border-[#E5E5E5] rounded px-[0.5vw] py-[0.3vw] outline-none"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs mb-1 text-[#232323]">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="border border-[#E5E5E5] rounded px-[0.5vw] py-[0.3vw] outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          className="px-[1vw] py-[0.3vw] rounded bg-[#4B2A06] text-white text-sm font-semibold hover:bg-[#3A2004]"
                          onClick={handleDateRangeApply}
                        >
                          Apply
                        </button>
                        <button
                          className="px-[1vw] py-[0.3vw] rounded bg-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-300"
                          onClick={() => setShowDatePicker(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {currentFolder?.name && (
                  <button
                    className="flex items-center bg-[#F3F4F6] gap-[0.5vw] text-[#5A6473] font-semibold rounded-lg  px-[1.2vw] py-[0.5vw] text-sm hover:text-[#4B2A06]"
                    onClick={() => setCurrentFolder(null)}
                    title="Back to all files"
                  >
                    <ArrowLeft className="h-[0.9vw] w-[0.9vw] min-w-[14px] min-h-[14px] " />
                    <div className="flex items-center  bg-[#F3F4F6] text-[#4B2A06] font-semibold  rounded-lg text-base">
                      <span
                        className="truncate max-w-[18vw]"
                        title={currentFolder.name}
                      >
                        {currentFolder.name}
                      </span>
                    </div>
                  </button>
                )}
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-[0.5vw]">
                <div className="flex bg-[#F3F4F6] rounded-lg p-1">
                  <button
                    className={`flex items-center gap-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                      viewMode === "list"
                        ? "bg-white text-[#4B2A06] shadow-sm"
                        : "text-[#5A6473] hover:text-[#4B2A06]"
                    }`}
                    onClick={() => setViewMode("list")}
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                    <span>List</span>
                  </button>
                  <button
                    className={`flex items-center gap-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                      viewMode === "card"
                        ? "bg-white text-[#4B2A06] shadow-sm"
                        : "text-[#5A6473] hover:text-[#4B2A06]"
                    }`}
                    onClick={() => setViewMode("card")}
                    title="Card view"
                  >
                    <Grid3X3 className="h-4 w-4" />
                    <span>Cards</span>
                  </button>
                </div>
              </div>
            </div>
            {/* Document Grid - make this area scrollable only */}
            <div className="flex-1 min-h-0">
              <div
                className={`${
                  user?.role === "admin" ? "h-[68vh]" : "h-[67vh]"
                } overflow-y-auto`}
              >
                {loading ? (
                  <div className="flex justify-center items-center h-[10vh] text-lg text-muted-foreground">
                    Loading documents...
                  </div>
                ) : error ? (
                  <div className="flex justify-center items-center h-[10vh] text-lg text-destructive">
                    {error}
                  </div>
                ) : (
                  <>
                    {viewMode === "card" ? (
                      <div className="grid grid-cols-4 gap-[1.5vw] mb-[1vw]">
                        {filteredDocs.length === 0 ? (
                          <div className="col-span-4 text-center text-muted-foreground">
                            No documents found.
                          </div>
                        ) : (
                          filteredDocs.map((doc) => (
                            <div
                              key={doc.id}
                              ref={(el) => (docRefs.current[doc.id] = el)}
                              className={`flex flex-col items-start bg-[#F3F4F6] rounded-xl p-[1vw] min-w-[180px] min-h-[110px] w-full cursor-pointer hover:bg-[#ECECEC] transition relative
                            ${
                              selectedDoc && selectedDoc.id === doc.id
                                ? "ring-2 ring-[#4B2A06] bg-[#ECECEC]"
                                : ""
                            }
                            ${
                              highlightedDocId === doc.id
                                ? "ring-4 ring-orange-400 bg-yellow-100 animate-pulse"
                                : ""
                            }
                          `}
                              onClick={() =>
                                navigate(`/doc/${doc.id || doc.namespace}`)
                              }
                              onAnimationEnd={() => {
                                if (highlightedDocId === doc.id)
                                  setHighlightedDocId(null);
                              }}
                            >
                              <div className="flex w-full justify-between items-start">
                                <FileText className="h-3 w-3 text-[#4B2A06] mb-[1vw]" />
                                <div className="flex ">
                                  {/* Compare button - always show */}
                                  <button
                                    className="text-muted-foreground hover:text-[#4B2A06] p-[0.3vw]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (doc.relatedRhpId || doc.relatedDrhpId) {
                                        // Document is already linked, go directly to compare
                                        navigate(`/compare/${doc.id}`);
                                      } else {
                                        // Document is not linked, show modal to select document
                                        handleCompareClick(doc);
                                      }
                                    }}
                                    title={doc.relatedRhpId || doc.relatedDrhpId ? "Compare documents" : "Compare with other document"}
                                    disabled={compareLoading}
                                  >
                                    <GitCompare className="h-4 w-4" />
                                  </button>

                                  <button
                                    className="text-muted-foreground hover:text-[#4B2A06] p-[0.3vw]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRenameClick(doc);
                                    }}
                                    title="Rename document"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    className="text-muted-foreground hover:text-[#4B2A06] p-[0.3vw]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openMoveDialog(doc);
                                    }}
                                    title="Move to folder"
                                  >
                                    <FolderIcon className="h-3 w-3" />
                                  </button>
                                  <button
                                    className="text-muted-foreground hover:text-[#4B2A06] p-[0.3vw]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShareDocId(doc.id);
                                    }}
                                    title="Share"
                                  >
                                    <Share2 className="h-3 w-3" />
                                  </button>
                                  <button
                                    className=" text-muted-foreground hover:text-destructive p-[0.3vw] disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (user?.role === "admin") {
                                        handleDeleteDoc(doc);
                                      }
                                    }}
                                    disabled={user?.role !== "admin"}
                                    title={
                                      user?.role !== "admin"
                                        ? "Only admins can delete documents"
                                        : "Delete document"
                                    }
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              {renamingDocId === doc.id ? (
                                <div className="flex items-center w-full mt-[0.5vw] mb-[0.5vw]">
                                  <input
                                    className="font-semibold text-[#232323] mb-1 max-w-full truncate block border border-gray-300 rounded px-[0.5vw] py-[0.3vw] outline-none focus:outline-none focus:ring-0 focus:border-gray-300"
                                    style={{ maxWidth: "120px" }}
                                    value={renameValue}
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()} // Prevent navigation on click
                                    onFocus={(e) => e.stopPropagation()} // Prevent navigation on focus
                                    onChange={handleRenameChange}
                                    onBlur={() => handleRenameSubmit(doc)}
                                    onKeyDown={(e) =>
                                      handleRenameKeyDown(e, doc)
                                    }
                                  />
                                  <button
                                    className="ml-[0.5vw] text-muted-foreground hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRenamingDocId(null);
                                    }}
                                    title="Cancel rename"
                                  >
                                    <X className="h-[0.8vw] w-[0.8vw] min-w-[12px] min-h-[12px]" />
                                  </button>
                                </div>
                              ) : (
                                <span
                                  className="font-semibold text-[#232323] mb-1 max-w-full truncate block"
                                  style={{
                                    maxWidth: "180px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {doc.name}
                                </span>
                              )}
                              <span className="text-[#A1A1AA] text-sm">
                                {doc.size ||
                                  (doc.fileSize
                                    ? `${Math.round(doc.fileSize / 1024)} KB`
                                    : "")}
                              </span>
                              <div className="flex items-center justify-between w-full mt-[0.5vw]">
                                <span className="text-[#A1A1AA] text-xs">
                                  {doc.uploadedAt
                                    ? new Date(
                                        doc.uploadedAt
                                      ).toLocaleDateString()
                                    : ""}
                                </span>
                                <div className="flex justify-between items-center ">
                                  {/* Star icon for DRHP with RHP */}
                                  {doc.type === "DRHP" && doc.relatedRhpId && (
                                    <span
                                      className={`text-xs px-2 py-1 mx-1 rounded-full ${
                                        doc.type === "DRHP"
                                          ? "bg-[#ECE9E2] text-[#4B2A06]"
                                          : "bg-[#ECE9E2] text-[#4B2A06]"
                                      }`}
                                    >
                                      {"RHP"}
                                    </span>
                                  )}
                                  <span
                                    className={`text-xs px-2 py-1 mx-1 rounded-full ${
                                      doc.type === "DRHP"
                                        ? "bg-[#ECE9E2] text-[#4B2A06]"
                                        : "bg-[#ECE9E2] text-[#4B2A06]"
                                    }`}
                                  >
                                    {doc.type}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <div className="bg-white overflow-hidden">
                        {/* List Header */}
                        <div className="bg-gray-50 border-b border-gray-200 rounded-lg px-6 py-3">
                          <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-600 ">
                            <div className="col-span-6">Name</div>
                            <div className="col-span-2">Doc type</div>
                            <div className="col-span-3">Last modified</div>
                            <div className="col-span-1 text-right">Actions</div>
                          </div>
                        </div>

                        {/* List Items */}
                        {filteredDocs.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            No documents found.
                          </div>
                        ) : (
                          filteredDocs.map((doc) => (
                            <div
                              key={doc.id}
                              ref={(el) => (docRefs.current[doc.id] = el)}
                              className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 cursor-pointer transition-colors relative
                            ${
                              selectedDoc && selectedDoc.id === doc.id
                                ? "bg-blue-50 border-blue-200"
                                : ""
                            }
                            ${
                              highlightedDocId === doc.id
                                ? "bg-yellow-100 border-yellow-300 animate-pulse"
                                : ""
                            }
                          `}
                              onClick={() =>
                                navigate(`/doc/${doc.id || doc.namespace}`)
                              }
                              onAnimationEnd={() => {
                                if (highlightedDocId === doc.id)
                                  setHighlightedDocId(null);
                              }}
                            >
                              {/* Name Column */}
                              <div className="col-span-6 flex items-center gap-3">
                                <FileText className="h-3 w-3 text-[#4B2A06] flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  {renamingDocId === doc.id ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        className="font-medium text-gray-900 border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:outline-none focus:ring-0 focus:border-gray-300"
                                        value={renameValue}
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                        onFocus={(e) => e.stopPropagation()}
                                        onChange={handleRenameChange}
                                        onBlur={() => handleRenameSubmit(doc)}
                                        onKeyDown={(e) =>
                                          handleRenameKeyDown(e, doc)
                                        }
                                      />
                                      <button
                                        className="text-gray-400 hover:text-red-500"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRenamingDocId(null);
                                        }}
                                        title="Cancel rename"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="font-medium text-gray-900 truncate">
                                      {doc.name}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Doc Type Column */}
                              <div className="col-span-2 flex items-center">
                                <div className="flex gap-1">
                                  {doc.type === "DRHP" && doc.relatedRhpId && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-[#ECE9E2] text-[#4B2A06]">
                                      RHP
                                    </span>
                                  )}
                                  <span className="text-xs px-2 py-1 rounded-full bg-[#ECE9E2] text-[#4B2A06]">
                                    {doc.type}
                                  </span>
                                </div>
                              </div>

                              {/* Last Modified Column */}
                              <div className="col-span-3 flex items-center">
                                <span className="text-sm text-gray-600">
                                  {doc.uploadedAt
                                    ? new Date(
                                        doc.uploadedAt
                                      ).toLocaleDateString()
                                    : ""}
                                </span>
                              </div>

                              {/* Actions Column */}
                              <div className="col-span-1 flex items-center justify-end">
                                <div className="flex items-center gap-1">
                                  {/* Compare button - always show */}
                                  <button
                                    className="text-muted-foreground hover:text-[#4B2A06] p-[0.3vw]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (doc.relatedRhpId || doc.relatedDrhpId) {
                                        // Document is already linked, go directly to compare
                                        navigate(`/compare/${doc.id}`);
                                      } else {
                                        // Document is not linked, show modal to select document
                                        handleCompareClick(doc);
                                      }
                                    }}
                                    title={doc.relatedRhpId || doc.relatedDrhpId ? "Compare documents" : "Compare with other document"}
                                    disabled={compareLoading}
                                  >
                                    <GitCompare className="h-4 w-4" />
                                  </button>
                                  <button
                                    className="text-[#4B2A06] hover:text-[#4B2A06] p-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRenameClick(doc);
                                    }}
                                    title="Rename document"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    className="text-[#4B2A06] hover:text-[#4B2A06] p-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openMoveDialog(doc);
                                    }}
                                    title="Move to folder"
                                  >
                                    <FolderIcon className="h-3 w-3" />
                                  </button>
                                  <button
                                    className="text-[#4B2A06] hover:text-[#4B2A06] p-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShareDocId(doc.id);
                                    }}
                                    title="Share"
                                  >
                                    <Share2 className="h-3 w-3 hover:bg-gray-200 rounded-sm " />
                                  </button>

                                  <button
                                    className="text-[#4B2A06] hover:text-red-600 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (user?.role === "admin") {
                                        handleDeleteDoc(doc);
                                      }
                                    }}
                                    disabled={user?.role !== "admin"}
                                    title={
                                      user?.role !== "admin"
                                        ? "Only admins can delete documents"
                                        : "Delete document"
                                    }
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            {/* Delete Confirmation Dialog */}
            {showDeleteDialog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                <div className="bg-white rounded-lg shadow-lg p-[2vw] max-w-sm w-full">
                  <h2 className="text-lg font-bold mb-[1vw]">
                    Delete Document
                  </h2>
                  <p className="mb-[2vw]">
                    Are you sure you want to delete "{docToDelete?.name}"? This
                    action cannot be undone.
                  </p>
                  <div className="flex justify-end gap-[1vw]">
                    <button
                      className="px-[1vw] py-[0.5vw] rounded bg-gray-200 hover:bg-gray-300"
                      onClick={() => setShowDeleteDialog(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-[1vw] py-[0.5vw] rounded bg-red-600 text-white hover:bg-red-700"
                      onClick={confirmDeleteDoc}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Success Modal for Upload */}
            {showSuccessModal && uploadedDoc && (
              <div className="fixed inset-0 px-10 z-50 flex items-center justify-center bg-black bg-opacity-30">
                <div className="bg-white rounded-lg shadow-lg p-[2vw] max-w-sm w-full flex flex-col items-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h2 className="text-xl font-bold mb-2">
                    Document saved successfully!
                  </h2>
                  <p className="mb-4 text-center">
                    Your document <b>{uploadedDoc.name}</b> has been uploaded
                    and saved.
                  </p>
                  <button
                    className="px-6 py-2 rounded bg-[#4B2A06] text-white font-semibold hover:bg-[#3A2004]"
                    onClick={handleNavigateToExisting}
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </main>
          {/* Share Dialog */}
          <ShareDialog
            resourceType="document"
            resourceId={shareDocId}
            open={!!shareDocId}
            onOpenChange={(o) => !o && setShareDocId(null)}
          />
          <MoveDocumentDialog
            open={!!movingDocId}
            onOpenChange={(o) => {
              if (!o) {
                setMovingDocId(null);
                setMovingDocDirectoryId(null);
              }
            }}
            onSelectDestination={handleMoveSelect}
            currentDirectoryId={movingDocDirectoryId}
          />

          {/* RHP Upload Modal for Standalone Upload */}
          {showRhpUploadModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload RHP Document</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Select a Red Herring Prospectus (RHP) document to upload. This will be linked to a DRHP document.
                </p>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select RHP File
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setRhpFile(e.target.files[0]);
                      }
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    onClick={() => {
                      setShowRhpUploadModal(false);
                      setRhpFile(null);
                    }}
                    disabled={isUploading}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 text-sm font-medium text-white bg-[#4B2A06] hover:bg-[#3A2004] rounded-md disabled:opacity-50"
                    onClick={() => {
                      if (rhpFile) {
                        // For standalone RHP upload, directly upload the file
                        setShowRhpUploadModal(false);
                        handleUpload(rhpFile, "RHP");
                        setRhpFile(null);
                      }
                    }}
                    disabled={!rhpFile || isUploading}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Compare Document Modal */}
          <CompareDocumentModal
            open={showCompareModal}
            onClose={() => {
              setShowCompareModal(false);
              setSelectedDocumentForCompare(null);
              setAvailableDocumentsForCompare([]);
            }}
            selectedDocument={selectedDocumentForCompare}
            availableDocuments={availableDocumentsForCompare}
            onDocumentSelect={handleDocumentSelection}
            loading={compareLoading}
          />
        </div>
      </div>
    </div>
  );
};
