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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { LogOut, Settings } from "lucide-react";
import { documentService } from "@/services/api";
import { uploadService } from "@/lib/api/uploadService";
import { sessionService } from "@/lib/api/sessionService";
import { toast } from "sonner";
import { useRefreshProtection } from "../hooks/useRefreshProtection";
import { Navbar } from "./Navbar";
import { RhpUploadModal } from "./RhpUploadModal";

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
  const [showRhpModal, setShowRhpModal] = useState<string | null>(null);

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
    documentService
      .getAll()
      .then((docs) => {
        setDocuments(docs);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load documents");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(
      <div className="flex items-center gap-2">
        <span>Checking {file.name}...</span>
      </div>
    );

    try {
      // Use backend upload endpoint to store PDF in GridFS
      const response = await uploadService.uploadFileToBackend(file);

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
            <AlertCircle className="h-4 w-4 text-destructive" />
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
    const docDate = new Date(doc.uploadedAt || doc.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && docDate < start) return false;
    if (end && docDate > end) return false;
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

  return (
    <div
      className="min-h-screen bg-white flex flex-col font-sans"
      style={{ fontFamily: "Inter, Arial, sans-serif" }}
    >
      <Navbar showSearch searchValue={search} onSearchChange={setSearch} />
      {/* Main Content */}
      <main className="flex-1 flex flex-col pt-[2vw] pb-[4vh] relative max-w-[92vw] mx-auto w-full min-h-0">
        {/* Upload button at top right */}
        <div className="flex justify-between mt-[1vw]">
          <h1
            className="text-5xl font-extrabold mb-[2vw]"
            style={{ color: "#232323", fontFamily: "Inter, Arial, sans-serif" }}
          >
            Start New <span style={{ color: "#FF7A1A" }}>Conversation</span>
          </h1>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf"
            className="hidden outline-none"
            disabled={isUploading}
          />
          <button
            className="flex items-center gap-[0.5vw] bg-[#4B2A06] text-white font-semibold px-[2vw] py-0 rounded-xl shadow-lg text-lg transition hover:bg-[#3A2004] focus:outline-none my-[1vw]"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-[1.5vw] w-[1.5vw] min-w-[24px] min-h-[24px] animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Upload{" "}
                <Upload className="h-[1.5vw] w-[1.5vw] min-w-[24px] min-h-[24px]" />
              </>
            )}
          </button>
        </div>
        {/* Filters and Search */}
        <div className="flex gap-[1vw] mb-[2vw] items-center">
          <button className="flex items-center gap-[0.5vw] bg-[#F3F4F6] text-[#5A6473] font-semibold px-[1.5vw] py-[0.5vw] rounded-lg text-base">
            All Files
          </button>
          <div className="relative">
            <button
              className="flex items-center gap-[0.5vw] bg-[#F3F4F6] text-[#5A6473] font-semibold px-[1.5vw] py-[0.5vw] rounded-lg text-base"
              onClick={() => setShowDatePicker((v) => !v)}
              type="button"
            >
              Date Range{" "}
              <Calendar className="h-[1vw] w-[1vw] min-w-[16px] min-h-[16px]" />
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
                <button
                  className="ml-[0.5vw] px-[1vw] py-[0.3vw] rounded bg-[#4B2A06] text-white text-sm font-semibold hover:bg-[#3A2004]"
                  onClick={() => setShowDatePicker(false)}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
        {/* Document Grid - make this area scrollable only */}
        <div className="flex-1 min-h-0">
          <div className="h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-[10vh] text-lg text-muted-foreground">
                Loading documents...
              </div>
            ) : error ? (
              <div className="flex justify-center items-center h-[10vh] text-lg text-destructive">
                {error}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-[2vw] mb-[3vw]">
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
                        <FileText className="h-[1.5vw] w-[1.5vw] min-w-[24px] min-h-[24px] text-[#4B2A06] mb-[1vw]" />
                        <div className="flex gap-[0.5vw]">
                          {/* RHP Upload button for DRHP documents */}
                          {doc.type === "DRHP" && !doc.relatedRhpId && (
                            <>
                              <button
                                className="text-muted-foreground hover:text-blue-600 p-[0.3vw]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowRhpModal(doc.id);
                                }}
                                title="Upload RHP"
                              >
                                <Upload className="h-[1vw] w-[1vw] min-w-[16px] min-h-[16px]" />
                              </button>
                              <RhpUploadModal
                                drhpId={doc.id}
                                drhpName={doc.name}
                                open={showRhpModal === doc.id}
                                onOpenChange={(open) =>
                                  open
                                    ? setShowRhpModal(doc.id)
                                    : setShowRhpModal(null)
                                }
                                onUploadSuccess={() => {
                                  setShowRhpModal(null);
                                  fetchDocuments();
                                }}
                              />
                            </>
                          )}

                          {/* Compare button for DRHP with RHP */}
                          {doc.type === "DRHP" && doc.relatedRhpId && (
                            <button
                              className="text-muted-foreground hover:text-green-600 p-[0.3vw]"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/compare/${doc.id}`);
                              }}
                              title="Compare DRHP and RHP"
                            >
                              <BarChart3 className="h-[1vw] w-[1vw] min-w-[16px] min-h-[16px]" />
                            </button>
                          )}

                          <button
                            className="text-muted-foreground hover:text-[#4B2A06] p-[0.3vw]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameClick(doc);
                            }}
                            title="Rename document"
                          >
                            <Pencil className="h-[1vw] w-[1vw] min-w-[16px] min-h-[16px]" />
                          </button>
                          <button
                            className="ml-[0.5vw] text-muted-foreground hover:text-destructive p-[0.3vw]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDoc(doc);
                            }}
                            title="Delete document"
                          >
                            <Trash2 className="h-[1vw] w-[1vw] min-w-[16px] min-h-[16px]" />
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
                            onKeyDown={(e) => handleRenameKeyDown(e, doc)}
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
                            ? new Date(doc.uploadedAt).toLocaleDateString()
                            : ""}
                        </span>
                        <div className="flex justify-between items-center ">
                          {/* Star icon for DRHP with RHP */}
                          {doc.type === "DRHP" && doc.relatedRhpId && (
                            <span
                              className={`text-xs px-2 py-1 mx-1 rounded-full ${
                                doc.type === "DRHP"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {"RHP"}
                            </span>
                          )}
                          <span
                            className={`text-xs px-2 py-1 mx-1 rounded-full ${
                              doc.type === "DRHP"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {doc.type || "DRHP"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg p-[2vw] max-w-sm w-full">
              <h2 className="text-lg font-bold mb-[1vw]">Delete Document</h2>
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
                Your document <b>{uploadedDoc.name}</b> has been uploaded and
                saved.
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
    </div>
  );
};
