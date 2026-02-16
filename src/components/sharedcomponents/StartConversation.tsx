/**
 * StartConversation Component
 * 
 * Main dashboard component for the RHP Document Management System.
 * Provides a directory-first interface where users can:
 * - View and manage company directories (folders)
 * - Upload DRHP and RHP documents to directories
 * - Compare documents within the same directory
 * - Navigate between directory and document views
 * - Perform CRUD operations on directories and documents
 * 
 * Key Features:
 * - Directory-based organization (each company has its own directory)
 * - Automatic document type detection (DRHP/RHP)
 * - Smart compare functionality (auto-links documents in same directory)
 * - Upload guidance (suggests missing document type for comparison)
 * - List and card view modes for directories and documents
 */

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
  ChevronRight,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Share,
  Share2,
  Building2,
  MoreVertical,
  MoveVerticalIcon,
  FolderSync,
  MoveUpRight,
  FolderUpIcon,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { documentService, reportService, summaryService } from "@/services/api";
import { uploadService } from "@/lib/api/uploadService";
import { sessionService } from "@/lib/api/sessionService";
import { toast } from "sonner";
import { useRefreshProtection } from "@/hooks/useRefreshProtection";
import { Navbar } from "@/components/sharedcomponents/Navbar";
import { RhpUploadModal } from "@/components/documentcomponents/RhpUploadModal";
import { DrhpUploadModal } from "@/components/documentcomponents/DrhpUploadModal";
import { Sidebar } from "@/components/chatcomponents/Sidebar";
import { FolderSidebar } from "@/components/sharedcomponents/FolderSidebar";
import { directoryService, shareService } from "@/services/api";
import { ShareDialog } from "@/components/documentcomponents/ShareDialog";
import MoveDocumentDialog from "@/components/documentcomponents/MoveDocumentDialog";
import MoveDocumentToWorkspaceDialog from "@/components/documentcomponents/MoveDocumentToWorkspaceDialog";
import { CompareDocumentModal } from "@/components/documentcomponents/CompareDocumentModal";
import { DirectorySelector } from "@/components/directorycomponents/DirectorySelector";
import { trackDirectoryOpen } from "@/utils/directoryTracking";
import { getCurrentWorkspace } from "@/services/workspaceContext";
import { ViewSummaryModal } from "@/components/documentcomponents/ViewSummaryModal";
import { ViewReportModal } from "@/components/documentcomponents/ViewReportModal";

export const StartConversation: React.FC = () => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Core data state
  const [documents, setDocuments] = useState<any[]>([]); // Documents in current directory
  const [directories, setDirectories] = useState<any[]>([]); // All directories (unfiltered list)
  const [loading, setLoading] = useState(false); // Loading state for documents
  const [directoriesLoading, setDirectoriesLoading] = useState(false); // Loading state for directories
  const [isUploading, setIsUploading] = useState(false); // Upload in progress flag
  const [error, setError] = useState<string | null>(null); // Error message state

  // Document selection and navigation state
  const [selectedDoc, setSelectedDoc] = useState<any>(null); // Currently selected document
  const navigate = useNavigate(); // React Router navigation hook
  const [searchParams] = useSearchParams(); // URL search parameters (for shared links)
  const { user, logout, isAuthenticated } = useAuth(); // Authentication context

  // File upload and input management
  const fileInputRef = useRef<HTMLInputElement>(null); // Reference to hidden file input
  const [sessionData] = useState(() => sessionService.initializeSession()); // Session initialization

  // Date and search filtering state
  const [showDatePicker, setShowDatePicker] = useState(false); // Date picker visibility
  const [startDate, setStartDate] = useState(""); // Start date for date range filter
  const [endDate, setEndDate] = useState(""); // End date for date range filter
  const [search, setSearch] = useState(""); // Search query string
  // Document deletion state
  const [docToDelete, setDocToDelete] = useState<any>(null); // Document pending deletion
  const [showDeleteDialog, setShowDeleteDialog] = useState(false); // Delete confirmation dialog visibility
  const [summaryToDelete, setSummaryToDelete] = useState<any>(null); // Summary pending deletion
  const [showDeleteSummaryDialog, setShowDeleteSummaryDialog] = useState(false); // Delete summary confirmation dialog visibility
  const [reportToDelete, setReportToDelete] = useState<any>(null); // Report pending deletion
  const [showDeleteReportDialog, setShowDeleteReportDialog] = useState(false); // Delete report confirmation dialog visibility

  // Deletion loading states
  const [isDeletingDocument, setIsDeletingDocument] = useState(false); // Deletion in progress for document
  const [isDeletingDirectory, setIsDeletingDirectory] = useState(false); // Deletion in progress for directory
  // Document renaming state
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null); // ID of document being renamed
  const [renameValue, setRenameValue] = useState<string>(""); // Temporary rename input value
  const [renamingSummaryId, setRenamingSummaryId] = useState<string | null>(null); // ID of summary being renamed
  const [renameSummaryValue, setRenameSummaryValue] = useState<string>(""); // Temporary rename input value for summary
  const [renamingReportId, setRenamingReportId] = useState<string | null>(null); // ID of report being renamed
  const [renameReportValue, setRenameReportValue] = useState<string>(""); // Temporary rename input value for report

  // Upload success and highlighting state
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Upload success modal visibility
  const [uploadedDoc, setUploadedDoc] = useState<any>(null); // Recently uploaded document
  const [highlightedDocId, setHighlightedDocId] = useState<string | null>(null); // Document ID to highlight (for duplicates)
  const docRefs = useRef<{ [key: string]: HTMLDivElement | null }>({}); // Refs for scrolling to documents

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false); // Chat sidebar visibility
  const [viewMode, setViewMode] = useState<"list" | "card">("list"); // View mode: list or card grid

  // Current directory/folder state (persisted in localStorage)
  // Stores the currently open directory to restore navigation state on page reload
  const [currentFolder, setCurrentFolder] = useState<{
    id: string | null;
    name: string;
  } | null>(() => {
    const saved = localStorage.getItem("currentFolder");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.id === null || typeof parsed.id === "string") && typeof parsed.name === "string") {
          return parsed;
        }
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
    return null;
  });

  // Save current folder to localStorage whenever it changes
  useEffect(() => {
    if (currentFolder) {
      localStorage.setItem("currentFolder", JSON.stringify(currentFolder));
    } else {
      localStorage.removeItem("currentFolder");
    }
  }, [currentFolder]);

  // Sharing state
  const [shareDocId, setShareDocId] = useState<string | null>(null); // Document ID to share

  // Filtering state
  const [timeFilter, setTimeFilter] = useState<string>("all"); // Document time filter (backward compatibility)
  const [directoryTimeFilter, setDirectoryTimeFilter] = useState<string>("all"); // Directory time filter
  const [showTimeFilter, setShowTimeFilter] = useState(false); // Time filter dropdown visibility
  const [showDirectoryTimeFilter, setShowDirectoryTimeFilter] = useState(false); // Directory time filter dropdown visibility
  const [isDateRangeApplied, setIsDateRangeApplied] = useState(false); // Date range filter active flag
  const [directorySortBy, setDirectorySortBy] = useState<"alphabetical" | "lastModified">("lastModified"); // Directory sort option

  // Document movement state
  const [movingDocId, setMovingDocId] = useState<string | null>(null); // Document ID being moved
  const [movingDocDirectoryId, setMovingDocDirectoryId] = useState<string | null>(null); // Current directory of document being moved
  const [movingDocToWorkspaceId, setMovingDocToWorkspaceId] = useState<string | null>(null); // Target workspace for document move
  const [movingDocToWorkspaceName, setMovingDocToWorkspaceName] = useState<string>(""); // Target workspace name

  // Upload type and modal state
  const [showUploadDropdown, setShowUploadDropdown] = useState(false); // Upload type dropdown visibility
  const [selectedUploadType, setSelectedUploadType] = useState<string>(""); // Selected upload type (DRHP/RHP)
  const [showRhpUploadModal, setShowRhpUploadModal] = useState(false); // RHP upload modal visibility
  const [showDrhpUploadModal, setShowDrhpUploadModal] = useState(false); // DRHP upload modal visibility
  const [rhpFile, setRhpFile] = useState<File | null>(null); // RHP file selected for upload

  // Directory document type tracking
  // Tracks which document types (DRHP/RHP) exist in each directory for UI display
  const [hasDrhpInDirectory, setHasDrhpInDirectory] = useState(false); // Current directory has DRHP
  const [hasRhpInDirectory, setHasRhpInDirectory] = useState(false); // Current directory has RHP
  const [directoryDocumentTypes, setDirectoryDocumentTypes] = useState<Record<string, { hasDrhp: boolean; hasRhp: boolean }>>({}); // Map of directory ID to document types

  // Directory compare state
  // Tracks which directories have linked documents (for showing view vs compare icon)
  const [directoryLinkedStatus, setDirectoryLinkedStatus] = useState<Record<string, boolean>>({}); // Map of directory ID to linked status

  // Compare modal state (for cross-directory comparisons)
  const [showCompareModal, setShowCompareModal] = useState(false); // Compare document selection modal visibility
  const [selectedDocumentForCompare, setSelectedDocumentForCompare] = useState<any>(null); // Document selected for comparison
  const [availableDocumentsForCompare, setAvailableDocumentsForCompare] = useState<any[]>([]); // Available documents for comparison
  const [compareLoading, setCompareLoading] = useState(false); // Compare operation in progress

  // Directory actions state
  const [renamingDirectoryId, setRenamingDirectoryId] = useState<string | null>(null);
  const [directoryRenameValue, setDirectoryRenameValue] = useState<string>("");
  const [shareDirectoryId, setShareDirectoryId] = useState<string | null>(null);
  const [movingDirectoryToWorkspaceId, setMovingDirectoryToWorkspaceId] = useState<string | null>(null);
  const [movingDirectoryToWorkspaceName, setMovingDirectoryToWorkspaceName] = useState<string>("");
  const [directoryToDelete, setDirectoryToDelete] = useState<any | null>(null);
  const [showDeleteDirectoryDialog, setShowDeleteDirectoryDialog] = useState(false);
  const [openDirectoryMenuId, setOpenDirectoryMenuId] = useState<string | null>(null);

  // Directory selector state (for upload flow)
  const [selectedDirectoryId, setSelectedDirectoryId] = useState<string | null>(null); // Selected directory ID for upload
  const [showDirectorySelector, setShowDirectorySelector] = useState(false); // Directory selector modal visibility
  const [pendingUpload, setPendingUpload] = useState<{ file: File; type: string } | null>(null); // File waiting for directory selection

  // Reports and summaries state for directories
  // Tracks available reports (comparison reports) and summaries for each directory
  const [directoryReports, setDirectoryReports] = useState<Record<string, number>>({}); // Map of directory ID to report count
  const [directorySummaries, setDirectorySummaries] = useState<Record<string, number>>({}); // Map of directory ID to summary count


  // Expandable sections state for current directory
  const [expandedSummariesSection, setExpandedSummariesSection] = useState(true); // Summaries section expanded state (default: expanded)
  const [expandedReportsSection, setExpandedReportsSection] = useState(true); // Reports section expanded state (default: expanded)

  // Current directory summaries and reports data
  const [currentDirectorySummaries, setCurrentDirectorySummaries] = useState<any[]>([]); // Summaries for current directory
  const [currentDirectoryReports, setCurrentDirectoryReports] = useState<any[]>([]); // Reports for current directory
  const [summariesLoading, setSummariesLoading] = useState(false); // Loading state for summaries
  const [reportsLoading, setReportsLoading] = useState(false); // Loading state for reports

  // Modal state for viewing summaries and reports
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null); // Selected summary to view
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null); // Selected report to view
  const [showSummaryModal, setShowSummaryModal] = useState(false); // Summary modal visibility
  const [showReportModal, setShowReportModal] = useState(false); // Report modal visibility

  // ============================================================================
  // HOOKS AND EFFECTS
  // ============================================================================

  /**
   * Refresh Protection Hook
   * Prevents page refresh during file upload to avoid losing upload progress
   */
  useRefreshProtection(
    isUploading,
    "A file is currently uploading. Please wait."
  );

  /**
   * Socket Event Handler for Upload Status
   * Listens for real-time upload status updates via WebSocket
   * - Refreshes document list when upload completes
   * - Updates directory document types
   * - Shows notification when both DRHP and RHP become available for comparison
   */
  useEffect(() => {
    const handleUploadStatus = async (data: {
      jobId: string;
      status: string;
      error?: string;
    }) => {
      if (data.status === "failed") {
        toast.error(`Upload failed: ${data.error || "Unknown error"}`);
      } else if (data.status === "completed") {
        toast.success("Upload completed successfully!");
        fetchDocuments(); // Refresh the document list

        // Refresh directory document types if we're viewing a directory
        if (currentFolder?.id) {
          const updatedTypes = await fetchDirectoryDocumentTypes(currentFolder.id);
          setDirectoryDocumentTypes(prev => ({
            ...prev,
            [currentFolder.id]: updatedTypes
          }));

          // Refresh documents, summaries, and reports together
          const refreshDirectoryData = async () => {
            try {
              const [docs, allSummaries, allReports] = await Promise.all([
                documentService.getAll({ directoryId: currentFolder.id }),
                summaryService.getAll().catch(() => []),
                reportService.getAll().catch(() => [])
              ]);

              // Filter and sort summaries
              const summariesForDirectory = (allSummaries || []).filter((summary: any) =>
                (docs || []).some((doc: any) => doc.id === summary.documentId)
              ).sort((a: any, b: any) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              );

              // Filter and sort reports
              const reportsForDirectory = (allReports || []).filter((report: any) => {
                return (docs || []).some((doc: any) => {
                  if (doc.type === "DRHP" && doc.relatedRhpId) {
                    const rhp = (docs || []).find((d: any) => d.id === doc.relatedRhpId);
                    if (rhp) {
                      return (
                        (report.drhpNamespace === doc.namespace && report.rhpNamespace === rhp.rhpNamespace) ||
                        (report.drhpId === doc.id && report.rhpId === rhp.id)
                      );
                    }
                  }
                  return false;
                });
              }).sort((a: any, b: any) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              );

              // Update all state together
              setDocuments(docs || []);
              setCurrentDirectorySummaries(summariesForDirectory);
              setCurrentDirectoryReports(reportsForDirectory);
            } catch (err) {
              console.error("Error refreshing directory data:", err);
            }
          };

          refreshDirectoryData();

          // Check if both documents are now available and prompt for compare
          if (updatedTypes.hasDrhp && updatedTypes.hasRhp) {
            // Small delay to ensure documents are fully processed
            setTimeout(() => {
              toast.success(
                <div className="flex items-center gap-2">
                  <span>Both documents are now available! Click compare to view comparison.</span>
                </div>,
                { duration: 5000 }
              );
            }, 1000);
          }
        }
      }
    };

    // Listen for socket events (if socket is available)
    if (window.io) {
      window.io.on("upload_status", handleUploadStatus);
      return () => {
        window.io.off("upload_status", handleUploadStatus);
      };
    }
  }, [currentFolder?.id]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Update Directory Last Modified Time
   * Updates the directory's lastDocumentUpload when documents, summaries, or reports are created/updated
   * This ensures the directory appears at the top of the list when sorted by last modified
   * 
   * @param directoryId - ID of the directory to update
   */
  const updateDirectoryLastModified = (directoryId: string | null | undefined) => {
    if (!directoryId) return;

    const now = new Date().toISOString();
    setDirectories((prevDirs) =>
      prevDirs.map((dir) =>
        dir.id === directoryId
          ? { ...dir, lastDocumentUpload: now }
          : dir
      )
    );
    // Refresh directories from backend to ensure consistency
    fetchAllDirectories();
  };

  /**
   * Get User Initials from Email
   * Extracts initials from email address for display purposes
   * @param email - User email address
   * @returns Uppercase initials (max 2 characters)
   */
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

  /**
   * Fetch Document Types for a Directory
   * Retrieves and analyzes documents in a directory to determine:
   * - Whether directory contains DRHP documents
   * - Whether directory contains RHP documents
   * - Whether documents are already linked for comparison
   * 
   * Also updates the directoryLinkedStatus state to show correct compare icon
   * 
   * @param directoryId - ID of the directory to check
   * @returns Object with hasDrhp and hasRhp boolean flags
   */
  const fetchDirectoryDocumentTypes = async (directoryId: string) => {
    try {
      const docs = await documentService.getAll({ directoryId });
      const hasDrhp = (docs || []).some((doc: any) => doc.type === "DRHP");
      const hasRhp = (docs || []).some((doc: any) => doc.type === "RHP");

      // Check if documents are linked
      let isLinked = false;
      if (hasDrhp && hasRhp) {
        const drhpDoc = (docs || []).find((doc: any) => doc.type === "DRHP");
        const rhpDoc = (docs || []).find((doc: any) => doc.type === "RHP");
        isLinked = !!(drhpDoc?.relatedRhpId === rhpDoc?.id || rhpDoc?.relatedDrhpId === drhpDoc?.id);
      }

      // Update linked status
      setDirectoryLinkedStatus(prev => ({
        ...prev,
        [directoryId]: isLinked
      }));

      return { hasDrhp, hasRhp };
    } catch (err) {
      console.error(`Error fetching document types for directory ${directoryId}:`, err);
      return { hasDrhp: false, hasRhp: false };
    }
  };

  /**
   * Fetch Reports and Summaries for All Directories
   * Optimized version that fetches all reports and summaries once,
   * then calculates counts for each directory efficiently using pre-fetched documents
   * 
   * @param directories - Array of directory objects
   * @param documentsByDirectory - Pre-fetched documents grouped by directoryId (optional)
   */
  const fetchAllDirectoryReportsAndSummaries = async (
    directories: any[],
    documentsByDirectory?: Record<string, any[]>
  ) => {
    try {
      // Fetch all reports and summaries in parallel (single API calls)
      const [allReports, allSummaries] = await Promise.all([
        reportService.getAll().catch((err) => {
          if (err?.response?.status === 429) {
            console.warn("Rate limited when fetching reports");
            return [];
          }
          console.error("Error fetching reports:", err);
          return [];
        }),
        summaryService.getAll().catch((err) => {
          if (err?.response?.status === 429) {
            console.warn("Rate limited when fetching summaries");
            return [];
          }
          console.error("Error fetching summaries:", err);
          return [];
        })
      ]);

      // Use pre-fetched documents if provided, otherwise fetch all documents
      let docsByDir = documentsByDirectory;
      if (!docsByDir) {
        const allDocuments = await documentService.getAll().catch((err) => {
          console.error("Error fetching all documents:", err);
          return [];
        });

        docsByDir = {};
        (allDocuments || []).forEach((doc: any) => {
          if (doc.directoryId) {
            if (!docsByDir![doc.directoryId]) {
              docsByDir![doc.directoryId] = [];
            }
            docsByDir![doc.directoryId].push(doc);
          }
        });
      }

      // Process all directories in parallel (no batching delays needed)
      const reportsMap: Record<string, number> = {};
      const summariesMap: Record<string, number> = {};

      await Promise.all(
        directories.map(async (dir: any) => {
          if (!dir.id) {
            reportsMap[dir.id] = 0;
            summariesMap[dir.id] = 0;
            return;
          }

          try {
            const dirDocuments = docsByDir![dir.id] || [];

            // Find linked document pairs in this directory
            const linkedPairs: { drhp: any; rhp: any }[] = [];
            dirDocuments.forEach((doc: any) => {
              if (doc.type === "DRHP" && doc.relatedRhpId) {
                const rhp = dirDocuments.find((d: any) => d.id === doc.relatedRhpId);
                if (rhp) {
                  linkedPairs.push({ drhp: doc, rhp });
                }
              }
            });

            // Count reports for linked pairs in this directory
            let reportCount = 0;
            linkedPairs.forEach(({ drhp, rhp }) => {
              const reportsForPair = allReports.filter(
                (r: any) =>
                  (r.drhpNamespace === drhp.namespace && r.rhpNamespace === rhp.rhpNamespace) ||
                  (r.drhpId === drhp.id && r.rhpId === rhp.id)
              );
              reportCount += reportsForPair.length;
            });

            // Count summaries for documents in this directory
            const summaryCount = dirDocuments.reduce((count: number, doc: any) => {
              const summariesForDoc = allSummaries.filter((s: any) => s.documentId === doc.id);
              return count + summariesForDoc.length;
            }, 0);

            reportsMap[dir.id] = reportCount;
            summariesMap[dir.id] = summaryCount;
          } catch (error) {
            console.error(`Error processing directory ${dir.id}:`, error);
            reportsMap[dir.id] = 0;
            summariesMap[dir.id] = 0;
          }
        })
      );

      // Update state with all results at once
      setDirectoryReports((prev) => ({ ...prev, ...reportsMap }));
      setDirectorySummaries((prev) => ({ ...prev, ...summariesMap }));
    } catch (error) {
      console.error("Error fetching reports/summaries:", error);
    }
  };

  /**
   * Fetch All Directories
   * Loads all root-level directories for the current workspace
   * - Fetches directories in batches (500 per page)
   * - Fetches document type information for each directory
   * - Updates directoryDocumentTypes state for UI display
   * - Fetches reports and summaries for each directory
   * 
   * Used when viewing the directory list (not inside a specific directory)
   */
  const fetchAllDirectories = async () => {
    setDirectoriesLoading(true);
    setError(null);
    try {
      // Fetch all directories with a large pageSize to get all of them
      const data = await directoryService.listChildren("root", {
        pageSize: 500, // Get up to 500 directories
        page: 1,
      });
      let onlyDirs = (data?.items || [])
        .filter((x: { kind: string }) => x.kind === "directory")
        .map((x: { item: any }) => x.item);

      // If there are more directories, fetch additional pages
      if (data?.total && data.total > 500) {
        const totalPages = Math.ceil(data.total / 500);
        const additionalPages = [];
        for (let page = 2; page <= totalPages; page++) {
          const pageData = await directoryService.listChildren("root", {
            pageSize: 500,
            page: page,
          });
          const pageDirs = (pageData?.items || [])
            .filter((x: { kind: string }) => x.kind === "directory")
            .map((x: { item: any }) => x.item);
          additionalPages.push(...pageDirs);
        }
        onlyDirs = [...onlyDirs, ...additionalPages];
      }

      // Store all directories (unfiltered) - similar to documents array
      setDirectories(onlyDirs);

      // Fetch all documents once to use for both document types and reports/summaries
      const allDocuments = await documentService.getAll().catch((err) => {
        console.error("Error fetching all documents:", err);
        return [];
      });

      // Group documents by directoryId for efficient lookup
      const documentsByDirectory: Record<string, any[]> = {};
      (allDocuments || []).forEach((doc: any) => {
        if (doc.directoryId) {
          if (!documentsByDirectory[doc.directoryId]) {
            documentsByDirectory[doc.directoryId] = [];
          }
          documentsByDirectory[doc.directoryId].push(doc);
        }
      });

      // Fetch document types and reports/summaries in parallel for faster loading
      const [typesMap] = await Promise.all([
        // Calculate document types from already-fetched documents
        (async () => {
          const types: Record<string, { hasDrhp: boolean; hasRhp: boolean }> = {};
          const linkedStatus: Record<string, boolean> = {};

          onlyDirs.forEach((dir: any) => {
            if (!dir.id) return;

            const dirDocuments = documentsByDirectory[dir.id] || [];
            const hasDrhp = dirDocuments.some((doc: any) => doc.type === "DRHP");
            const hasRhp = dirDocuments.some((doc: any) => doc.type === "RHP");

            // Check if documents are linked
            let isLinked = false;
            if (hasDrhp && hasRhp) {
              const drhpDoc = dirDocuments.find((doc: any) => doc.type === "DRHP");
              const rhpDoc = dirDocuments.find((doc: any) => doc.type === "RHP");
              isLinked = !!(drhpDoc?.relatedRhpId === rhpDoc?.id || rhpDoc?.relatedDrhpId === drhpDoc?.id);
            }

            types[dir.id] = { hasDrhp, hasRhp };
            linkedStatus[dir.id] = isLinked;
          });

          // Update linked status
          setDirectoryLinkedStatus((prev) => ({ ...prev, ...linkedStatus }));

          return types;
        })(),
        // Fetch reports and summaries for all directories in parallel (using already-fetched documents)
        fetchAllDirectoryReportsAndSummaries(onlyDirs, documentsByDirectory).catch((err) => {
          console.error("Error fetching directory reports/summaries:", err);
        })
      ]);

      setDirectoryDocumentTypes(typesMap);
    } catch (err: any) {
      console.error("Error fetching directories:", err);
      setError("Failed to load directories");
    } finally {
      setDirectoriesLoading(false);
    }
  };

  /**
   * Fetch Documents
   * Loads documents based on current context:
   * - If shared link token exists: loads shared document/directory
   * - If currentFolder is set: loads documents in that directory
   * - If no folder: loads all directories instead
   * 
   * Also updates document type flags (hasDrhpInDirectory, hasRhpInDirectory)
   * for smart upload button display
   */
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
        } catch { }
        // Fallback to normal listing if resolve fails
        // If no folder selected, show directories
        if (!currentFolder?.id) {
          fetchAllDirectories();
          return;
        }

        documentService
          .getAll({ directoryId: currentFolder.id })
          .then((docs) => {
            // Show all documents (DRHP and RHP) - no type filter
            setDocuments(docs || []);

            // Check what document types exist in this directory
            const hasDrhp = (docs || []).some((doc: any) => doc.type === "DRHP");
            const hasRhp = (docs || []).some((doc: any) => doc.type === "RHP");
            setHasDrhpInDirectory(hasDrhp);
            setHasRhpInDirectory(hasRhp);

            setLoading(false);
          })
          .catch(() => {
            setError("Failed to load documents");
            setLoading(false);
          });
      })();
      return;
    }

    // Clear link token from headers if domain mismatch might occur
    const linkToken = localStorage.getItem("sharedLinkToken");

    // If no folder is selected, show directories instead of documents
    if (!currentFolder?.id) {
      fetchAllDirectories();
      return;
    }

    documentService
      .getAll({ directoryId: currentFolder.id })
      .then((docs) => {
        // Show all documents (DRHP and RHP) - no type filter
        setDocuments(docs || []);

        // Check what document types exist in this directory
        const hasDrhp = (docs || []).some((doc: any) => doc.type === "DRHP");
        const hasRhp = (docs || []).some((doc: any) => doc.type === "RHP");
        setHasDrhpInDirectory(hasDrhp);
        setHasRhpInDirectory(hasRhp);

        setLoading(false);
      })
      .catch((err: any) => {
        // Check for domain mismatch error
        if (err?.response?.data?.code === "DOMAIN_MISMATCH" ||
          err?.response?.data?.message?.includes("cannot access documents from other domains")) {
          // Clear the link token if domain mismatch
          if (linkToken) {
            localStorage.removeItem("sharedLinkToken");
            // Remove linkToken from URL
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete("linkToken");
            window.history.replaceState({}, "", newUrl.toString());

            // Retry without link token
            documentService
              .getAll({ directoryId: currentFolder?.id ?? "root" })
              .then((docs) => {
                // Show all documents (DRHP and RHP) - no type filter
                setDocuments(docs || []);

                // Check what document types exist in this directory
                const hasDrhp = (docs || []).some((doc: any) => doc.type === "DRHP");
                const hasRhp = (docs || []).some((doc: any) => doc.type === "RHP");
                setHasDrhpInDirectory(hasDrhp);
                setHasRhpInDirectory(hasRhp);

                setLoading(false);
                toast.error("You cannot access documents from other domains. Showing your domain resources instead.");
              })
              .catch(() => {
                setError("Failed to load documents");
                setLoading(false);
              });
            return;
          }
        }

        setError("Failed to load documents");
        setLoading(false);
      });
  };

  /**
   * Fetch Summaries and Reports for Current Directory
   * Fetches all summaries and reports for documents in the current directory
   * Groups summaries by document type (RHP, DRHP)
   * 
   * @param directoryId - ID of the current directory
   */
  /**
   * Fetch Summaries and Reports for Current Directory
   * Fetches all summaries and reports for documents in the current directory
   * Groups summaries by document type (RHP, DRHP)
   * 
   * @param directoryId - ID of the current directory
   * @deprecated This function is kept for backward compatibility but data is now
   * fetched together with documents in the useEffect hook for better performance
   */
  const fetchDirectorySummariesAndReports = async (directoryId: string) => {
    setSummariesLoading(true);
    setReportsLoading(true);
    try {
      // Fetch documents in this directory
      const dirDocuments = await documentService.getAll({ directoryId });

      // Fetch all summaries and reports
      const [allSummaries, allReports] = await Promise.all([
        summaryService.getAll().catch(() => []),
        reportService.getAll().catch(() => [])
      ]);

      // Filter summaries for documents in this directory
      const summariesForDirectory = (allSummaries || []).filter((summary: any) =>
        (dirDocuments || []).some((doc: any) => doc.id === summary.documentId)
      );

      // Filter reports for linked document pairs in this directory
      const reportsForDirectory = (allReports || []).filter((report: any) => {
        return (dirDocuments || []).some((doc: any) => {
          if (doc.type === "DRHP" && doc.relatedRhpId) {
            const rhp = (dirDocuments || []).find((d: any) => d.id === doc.relatedRhpId);
            if (rhp) {
              return (
                (report.drhpNamespace === doc.namespace && report.rhpNamespace === rhp.rhpNamespace) ||
                (report.drhpId === doc.id && report.rhpId === rhp.id)
              );
            }
          }
          return false;
        });
      });

      // Sort by updatedAt (newest first)
      summariesForDirectory.sort((a: any, b: any) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      reportsForDirectory.sort((a: any, b: any) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setCurrentDirectorySummaries(summariesForDirectory);
      setCurrentDirectoryReports(reportsForDirectory);

      // Update directory's last modified time if there are new summaries or reports
      if ((summariesForDirectory.length > 0 || reportsForDirectory.length > 0) && directoryId) {
        // Check if there are any recent summaries or reports (created/updated in last minute)
        const now = new Date().getTime();
        const oneMinuteAgo = now - 60 * 1000;

        const hasRecentSummary = summariesForDirectory.some((s: any) => {
          const summaryTime = new Date(s.updatedAt || s.createdAt).getTime();
          return summaryTime > oneMinuteAgo;
        });

        const hasRecentReport = reportsForDirectory.some((r: any) => {
          const reportTime = new Date(r.updatedAt || r.createdAt).getTime();
          return reportTime > oneMinuteAgo;
        });

        if (hasRecentSummary || hasRecentReport) {
          updateDirectoryLastModified(directoryId);
        }
      }
    } catch (error) {
      console.error(`Error fetching summaries/reports for directory ${directoryId}:`, error);
      setCurrentDirectorySummaries([]);
      setCurrentDirectoryReports([]);
    } finally {
      setSummariesLoading(false);
      setReportsLoading(false);
    }
  };

  /**
   * Effect: Fetch Data When Folder Changes
   * Automatically loads appropriate data when currentFolder changes:
   * - If folder selected: fetch documents, summaries, and reports together
   * - If no folder: fetch all directories
   * - Resets document type flags when leaving a directory
   * - Fetches summaries and reports for the current directory
   */
  useEffect(() => {
    if (currentFolder?.id) {
      // Fetch documents, summaries, and reports together for better UX
      const loadDirectoryData = async () => {
        setLoading(true);
        setSummariesLoading(true);
        setReportsLoading(true);

        try {
          // Fetch all data in parallel
          const [docs, allSummaries, allReports] = await Promise.all([
            documentService.getAll({ directoryId: currentFolder.id }),
            summaryService.getAll().catch(() => []),
            reportService.getAll().catch(() => [])
          ]);

          // Check what document types exist in this directory
          const hasDrhp = (docs || []).some((doc: any) => doc.type === "DRHP");
          const hasRhp = (docs || []).some((doc: any) => doc.type === "RHP");

          // Filter summaries for documents in this directory
          const summariesForDirectory = (allSummaries || []).filter((summary: any) =>
            (docs || []).some((doc: any) => doc.id === summary.documentId)
          );

          // Filter reports for linked document pairs in this directory
          const reportsForDirectory = (allReports || []).filter((report: any) => {
            return (docs || []).some((doc: any) => {
              if (doc.type === "DRHP" && doc.relatedRhpId) {
                const rhp = (docs || []).find((d: any) => d.id === doc.relatedRhpId);
                if (rhp) {
                  return (
                    (report.drhpNamespace === doc.namespace && report.rhpNamespace === rhp.rhpNamespace) ||
                    (report.drhpId === doc.id && report.rhpId === rhp.id)
                  );
                }
              }
              return false;
            });
          });

          // Sort by updatedAt (newest first)
          summariesForDirectory.sort((a: any, b: any) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          reportsForDirectory.sort((a: any, b: any) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );

          // Update all state together in a single batch to prevent staggered rendering
          // React 18+ automatically batches these synchronous updates, ensuring they
          // all appear in the same render cycle - no need for startTransition
          setDocuments(docs || []);
          setHasDrhpInDirectory(hasDrhp);
          setHasRhpInDirectory(hasRhp);
          setCurrentDirectorySummaries(summariesForDirectory);
          setCurrentDirectoryReports(reportsForDirectory);

          // Update directory's last modified time if there are new summaries or reports
          if ((summariesForDirectory.length > 0 || reportsForDirectory.length > 0) && currentFolder?.id) {
            // Check if there are any recent summaries or reports (created/updated in last minute)
            const now = new Date().getTime();
            const oneMinuteAgo = now - 60 * 1000;

            const hasRecentSummary = summariesForDirectory.some((s: any) => {
              const summaryTime = new Date(s.updatedAt || s.createdAt).getTime();
              return summaryTime > oneMinuteAgo;
            });

            const hasRecentReport = reportsForDirectory.some((r: any) => {
              const reportTime = new Date(r.updatedAt || r.createdAt).getTime();
              return reportTime > oneMinuteAgo;
            });

            if (hasRecentSummary || hasRecentReport) {
              updateDirectoryLastModified(currentFolder.id);
            }
          }
        } catch (error) {
          console.error(`Error loading directory data for ${currentFolder.id}:`, error);
          setError("Failed to load directory data");
        } finally {
          setLoading(false);
          setSummariesLoading(false);
          setReportsLoading(false);
        }
      };

      loadDirectoryData();
    } else {
      // Fetch all directories when no folder is selected
      fetchAllDirectories();
      // Reset document type flags when leaving directory
      setHasDrhpInDirectory(false);
      setHasRhpInDirectory(false);
      // Clear summaries and reports
      setCurrentDirectorySummaries([]);
      setCurrentDirectoryReports([]);
    }
  }, [currentFolder?.id]);

  // ============================================================================
  // EVENT LISTENERS FOR SUMMARY AND REPORT CREATION
  // ============================================================================

  /**
   * Effect: Listen for Summary and Report Creation Events
   * Updates directory's last modified time when summaries or reports are created
   */
  useEffect(() => {
    const handleSummaryCreated = async (event: CustomEvent) => {
      const { documentId } = event.detail || {};
      if (!documentId) return;

      try {
        // Get the document to find its directory
        const doc = await documentService.getById(documentId);
        if (doc?.directoryId) {
          updateDirectoryLastModified(doc.directoryId);
        }
      } catch (error) {
        console.error("Error updating directory after summary creation:", error);
      }
    };

    const handleReportCreated = async (event: CustomEvent) => {
      const { drhpId, rhpId } = event.detail || {};
      if (!drhpId) return;

      try {
        // Get the DRHP document to find its directory
        const doc = await documentService.getById(drhpId);
        if (doc?.directoryId) {
          updateDirectoryLastModified(doc.directoryId);
        }
      } catch (error) {
        console.error("Error updating directory after report creation:", error);
      }
    };

    // Listen for custom events
    window.addEventListener("summaryCreated", handleSummaryCreated as EventListener);
    window.addEventListener("reportCreated", handleReportCreated as EventListener);

    return () => {
      window.removeEventListener("summaryCreated", handleSummaryCreated as EventListener);
      window.removeEventListener("reportCreated", handleReportCreated as EventListener);
    };
  }, []);

  /**
   * Effect: Close Upload Dropdown on Outside Click
   * Closes the upload type dropdown when user clicks outside of it
   * Improves UX by automatically closing dropdowns
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUploadDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest('.upload-dropdown-container')) {
          setShowUploadDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUploadDropdown]);

  /**
   * Effect: Close Directory Menu on Outside Click
   * Closes the 3-dot menu dropdown when user clicks outside of it
   * Ensures only one menu is open at a time
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDirectoryMenuId) {
        const target = event.target as HTMLElement;
        if (!target.closest('.directory-menu-container')) {
          setOpenDirectoryMenuId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDirectoryMenuId]);

  /**
   * Effect: Handle Shared Link Token from URL
   * Processes shared link tokens from URL query parameters
   * - Persists token to localStorage for long-lived access
   * - Resolves and displays shared resource (document or directory)
   */
  useEffect(() => {
    const linkToken = searchParams.get("linkToken");
    if (linkToken) {
      // Persist for long-lived access across navigation and reloads
      localStorage.setItem("sharedLinkToken", linkToken);
      handleLinkToken(linkToken);
    }
  }, [searchParams]);

  /**
   * Handle Shared Link Token
   * Resolves a shared link token and displays the shared resource
   * - Supports shared documents and directories
   * - Handles domain mismatch errors gracefully
   * - Shows appropriate error messages for invalid/expired links
   * 
   * @param token - Shared link token from URL or localStorage
   */
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
    } catch (error: any) {
      console.error("Error resolving link token:", error);

      // Check for domain mismatch error
      if (error?.response?.data?.code === "DOMAIN_MISMATCH" ||
        error?.response?.data?.message?.includes("cannot access documents from other domains")) {
        // Clear the link token from localStorage
        localStorage.removeItem("sharedLinkToken");
        // Remove linkToken from URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("linkToken");
        window.history.replaceState({}, "", newUrl.toString());

        // Show user-friendly error message
        toast.error("You cannot access documents from other domains. Showing your domain resources instead.");

        // Load user's own domain resources
        setCurrentFolder(null);
        fetchDocuments();
        return;
      }

      toast.error("Invalid or expired share link");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle File Selection from Input
   * Processes file selection from the hidden file input
   * - Validates file type (PDF only)
   * - If directory selected: uploads directly
   * - If no directory: shows directory selector first
   * 
   * @param e - File input change event
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const uploadType = selectedUploadType || "DRHP";

      // If directory is already selected, upload directly
      if (selectedDirectoryId || currentFolder?.id) {
        const directoryId = selectedDirectoryId || currentFolder?.id;
        handleUpload(file, uploadType);
      } else {
        // No directory selected - show directory selector first
        setPendingUpload({ file, type: uploadType });
        setShowDirectorySelector(true);
      }

      // Reset file input
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  /**
   * Handle Document Compare Click
   * Directory-based compare handler for individual documents
   * 
   * Flow:
   * 1. If document already linked → navigate directly to compare page
   * 2. If document in directory → find matching document (opposite type) in same directory
   * 3. If found → auto-link and navigate to compare
   * 4. If not found → show modal to select from other directories
   * 
   * @param document - Document object to compare
   */
  const handleCompareClick = async (document: any) => {
    setCompareLoading(true);

    try {
      // If document is already linked, navigate directly to compare page
      if (document.relatedRhpId || document.relatedDrhpId) {
        const drhpId = document.type === "DRHP" ? document.id : document.relatedDrhpId;
        navigate(`/compare/${drhpId}`);
        setCompareLoading(false);
        return;
      }

      // Directory-based compare: Check if document is in a directory
      if (document.directoryId) {
        const oppositeType = document.type === "DRHP" ? "RHP" : "DRHP";

        // First, try to find matching document in the currently loaded documents
        // (works when viewing the same directory)
        let matchingDoc = documents.find(
          (doc) =>
            doc.directoryId === document.directoryId &&
            doc.type === oppositeType &&
            doc.id !== document.id &&
            !doc.relatedDrhpId && // Not already linked
            !doc.relatedRhpId
        );

        // If not found in current documents array and we're viewing that directory,
        // fetch documents from that directory to check
        if (!matchingDoc && currentFolder?.id === document.directoryId) {
          try {
            const dirDocuments = await documentService.getAll({ directoryId: document.directoryId });
            matchingDoc = dirDocuments.find(
              (doc: any) =>
                doc.directoryId === document.directoryId &&
                doc.type === oppositeType &&
                doc.id !== document.id &&
                !doc.relatedDrhpId &&
                !doc.relatedRhpId
            );
          } catch (fetchError) {
            console.error("Error fetching directory documents:", fetchError);
            // Continue to modal fallback
          }
        }

        if (matchingDoc) {
          // Found matching document in same directory - auto-link and navigate
          const drhpId = document.type === "DRHP" ? document.id : matchingDoc.id;
          const rhpId = document.type === "RHP" ? document.id : matchingDoc.id;

          try {
            await documentService.linkForCompare(drhpId, rhpId);

            // Refresh documents to show updated link status
            if (currentFolder?.id === document.directoryId) {
              fetchDocuments();
            }

            // Navigate to compare page
            navigate(`/compare/${drhpId}`);
            toast.success("Documents linked successfully! Opening comparison...");
            setCompareLoading(false);
            return;
          } catch (linkError) {
            console.error("Error linking documents:", linkError);
            toast.error("Failed to link documents. Opening selection modal...");
            // Fall through to show modal
          }
        } else {
          // No matching document in directory - show helpful message
          const directoryName = currentFolder?.id === document.directoryId
            ? currentFolder.name
            : "this directory";
          toast.info(
            `No ${oppositeType} document found in "${directoryName}". Please select from other directories.`
          );
        }
      }

      // Fallback: Show modal for document selection (from other directories or if no directory)
      setSelectedDocumentForCompare(document);
      setShowCompareModal(true);

      // Fetch available documents in the background
      try {
        const response = await documentService.getAvailableForCompare(document.id);
        setAvailableDocumentsForCompare(response.availableDocuments);
      } catch (error) {
        console.error("Error fetching available documents:", error);
        toast.error("Failed to load documents for comparison");
      }
    } catch (error) {
      console.error("Error in compare flow:", error);
      toast.error("Failed to initiate comparison");
    } finally {
      setCompareLoading(false);
    }
  };

  /**
   * Handle Document Selection for Comparison
   * Links two documents for comparison and navigates to compare page
   * Used when user manually selects documents from the compare modal
   * 
   * @param selectedDoc - First document (the one user clicked compare on)
   * @param targetDoc - Second document (selected from modal)
   */
  const handleDocumentSelection = async (selectedDoc: any, targetDoc: any) => {
    try {
      setCompareLoading(true);

      // Determine correct id ordering for API
      const drhpId = selectedDoc.type === "DRHP" ? selectedDoc.id : targetDoc.id;
      const rhpId = selectedDoc.type === "RHP" ? selectedDoc.id : targetDoc.id;

      // Link the documents
      await documentService.linkForCompare(drhpId, rhpId);

      // Close modal
      setShowCompareModal(false);
      setSelectedDocumentForCompare(null);
      setAvailableDocumentsForCompare([]);

      // Navigate to compare page
      navigate(`/compare/${drhpId}`);

      toast.success("Documents linked successfully! Redirecting to comparison...");
    } catch (error) {
      console.error("Error linking documents:", error);
      toast.error("Failed to link documents for comparison");
    } finally {
      setCompareLoading(false);
    }
  };

  /**
   * Handle Directory Compare Click (Option 2 Implementation)
   * Smart directory-based compare with upload guidance
   * 
   * Flow:
   * 1. Check if directory has both DRHP and RHP
   *    - If yes → find documents, link if needed, navigate to compare
   * 2. If only one document type exists:
   *    - Open upload modal for missing type (RHP if DRHP exists, DRHP if RHP exists)
   * 3. If no documents:
   *    - Show message to upload documents first
   * 
   * This provides a complete workflow that guides users through the comparison setup
   * 
   * @param directory - Directory object to compare documents in
   */
  const handleDirectoryCompareClick = async (directory: any) => {
    try {
      setCompareLoading(true);

      // Check document types in this directory
      const types = directoryDocumentTypes[directory.id] || await fetchDirectoryDocumentTypes(directory.id);
      const hasDrhp = types.hasDrhp;
      const hasRhp = types.hasRhp;

      // If both documents exist, find them and navigate to compare
      if (hasDrhp && hasRhp) {
        // Fetch documents from this directory
        const dirDocuments = await documentService.getAll({ directoryId: directory.id });

        // Find DRHP and RHP documents
        const drhpDoc = dirDocuments.find((doc: any) => doc.type === "DRHP" && doc.directoryId === directory.id);
        const rhpDoc = dirDocuments.find((doc: any) => doc.type === "RHP" && doc.directoryId === directory.id);

        if (drhpDoc && rhpDoc) {
          // Check if already linked
          if (drhpDoc.relatedRhpId === rhpDoc.id || rhpDoc.relatedDrhpId === drhpDoc.id) {
            // Already linked, navigate directly
            navigate(`/compare/${drhpDoc.id}`);
            setCompareLoading(false);
            return;
          }

          // Link the documents if not already linked
          try {
            await documentService.linkForCompare(drhpDoc.id, rhpDoc.id);

            // Update linked status
            setDirectoryLinkedStatus(prev => ({
              ...prev,
              [directory.id]: true
            }));

            // Refresh directory document types
            const updatedTypes = await fetchDirectoryDocumentTypes(directory.id);
            setDirectoryDocumentTypes(prev => ({
              ...prev,
              [directory.id]: updatedTypes
            }));

            // Navigate to compare page
            navigate(`/compare/${drhpDoc.id}`);
            toast.success("Documents linked successfully! Opening comparison...");
            setCompareLoading(false);
            return;
          } catch (linkError) {
            console.error("Error linking documents:", linkError);
            toast.error("Failed to link documents for comparison");
            setCompareLoading(false);
            return;
          }
        } else {
          toast.error("Could not find documents in directory");
          setCompareLoading(false);
          return;
        }
      }

      // If only one document type exists, show upload modal for missing type
      if (hasDrhp && !hasRhp) {
        // RHP missing - open RHP upload modal
        setCurrentFolder({ id: directory.id, name: directory.name });
        setShowRhpUploadModal(true);
        toast.info("Please upload RHP document to compare with DRHP");
        setCompareLoading(false);
        return;
      }

      if (hasRhp && !hasDrhp) {
        // DRHP missing - open DRHP upload modal
        setCurrentFolder({ id: directory.id, name: directory.name });
        setShowDrhpUploadModal(true);
        toast.info("Please upload DRHP document to compare with RHP");
        setCompareLoading(false);
        return;
      }

      // No documents in directory - show message
      if (!hasDrhp && !hasRhp) {
        toast.info("This directory has no documents. Please upload DRHP or RHP first.");
        setCompareLoading(false);
        return;
      }
    } catch (error) {
      console.error("Error in directory compare:", error);
      toast.error("Failed to initiate comparison");
      setCompareLoading(false);
    }
  };

  /**
   * Handle Document Upload
   * Main upload handler with directory-first approach
   * 
   * Process:
   * 1. Validates file type (PDF only)
   * 2. Requires directory selection (directory-first approach)
   * 3. Checks for duplicates (client-side and server-side)
   * 4. Uploads file to backend
   * 5. Polls for processing status until complete
   * 6. Updates directory document types after successful upload
   * 
   * @param file - File object to upload
   * @param uploadType - Document type: "DRHP" or "RHP"
   */
  const handleUpload = async (file: File, uploadType: string = "DRHP") => {
    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }

    // NEW: Directory-first approach - require directory selection
    // If no directory is selected, show directory selector
    if (!selectedDirectoryId && !currentFolder?.id) {
      setPendingUpload({ file, type: uploadType });
      setShowDirectorySelector(true);
      toast.info("Please select a company directory to upload the document");
      return;
    }

    const directoryId = selectedDirectoryId || currentFolder?.id;
    if (!directoryId) {
      toast.error("Please select a company directory before uploading");
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
      formData.append("type", uploadType); // Send document type (DRHP or RHP) to backend
      formData.append("directoryId", directoryId); // Required - directory-first approach

      // Use the regular upload endpoint - backend will handle type based on formData
      const uploadEndpoint = `${import.meta.env.VITE_API_URL}/documents/upload`;

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

      const uploadedDocument = response.document;

      // Update toast to show processing status
      toast.dismiss(toastId);
      toast.loading(
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Processing {file.name}... This may take a few moments.</span>
        </div>,
        { id: `upload-processing-${uploadedDocument.id}`, duration: Infinity }
      );

      // Poll for document processing status
      let pollAttempts = 0;
      const maxPollAttempts = 120; // 10 minutes (5 second intervals)
      const pollInterval = 5000; // 5 seconds

      const pollForStatus = async () => {
        try {
          const doc = await documentService.getById(uploadedDocument.id);

          // Check if processing is complete
          if (doc.status === "completed" || doc.status === "ready") {
            toast.dismiss(`upload-processing-${uploadedDocument.id}`);
            toast.success(
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{file.name} processed successfully!</span>
              </div>
            );

            // Show success modal
            setUploadedDoc(doc);
            setShowSuccessModal(true);
            fetchDocuments(); // Refresh the document list
            // Update directory document types if document has a directoryId
            if (uploadedDocument.directoryId) {
              const types = await fetchDirectoryDocumentTypes(uploadedDocument.directoryId);
              setDirectoryDocumentTypes(prev => ({
                ...prev,
                [uploadedDocument.directoryId]: types
              }));
              // Update directory's last modified time
              updateDirectoryLastModified(uploadedDocument.directoryId);
            }
            setIsUploading(false);
            return;
          }

          // Check if processing failed
          if (doc.status === "failed" || doc.status === "error") {
            toast.dismiss(`upload-processing-${uploadedDocument.id}`);
            toast.error(
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span>Processing failed for {file.name}. Please try uploading again.</span>
              </div>
            );
            setIsUploading(false);
            return;
          }

          // Continue polling if still processing
          pollAttempts++;
          if (pollAttempts < maxPollAttempts) {
            setTimeout(pollForStatus, pollInterval);
          } else {
            // Timeout after max attempts
            toast.dismiss(`upload-processing-${uploadedDocument.id}`);
            toast.warning(
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span>{file.name} is taking longer than expected. You can check its status later.</span>
              </div>
            );
            setIsUploading(false);
            fetchDocuments(); // Refresh anyway
          }
        } catch (error) {
          console.error("Error polling document status:", error);
          pollAttempts++;
          if (pollAttempts < maxPollAttempts) {
            setTimeout(pollForStatus, pollInterval);
          } else {
            toast.dismiss(`upload-processing-${uploadedDocument.id}`);
            toast.error("Failed to check processing status. Please refresh the page.");
            setIsUploading(false);
          }
        }
      };

      // Start polling after a short delay
      setTimeout(pollForStatus, pollInterval);
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

  /**
   * Get Most Recent Activity Date for Directory
   * Returns the most recent date from:
   * - lastDocumentUpload (when document was uploaded)
   * - updatedAt (when summary/report was created or directory was updated)
   * - createdAt (fallback if nothing else exists)
   * 
   * This ensures directories with any recent activity (documents, summaries, reports)
   * are properly ranked and filtered.
   * 
   * @param dir - Directory object
   * @returns Date object or null if no valid date found
   */
  const getDirectoryMostRecentActivity = (dir: any): Date | null => {
    const dates: Date[] = [];

    // Collect all valid dates
    if (dir.lastDocumentUpload) {
      const date = new Date(dir.lastDocumentUpload);
      if (!isNaN(date.getTime())) dates.push(date);
    }

    if (dir.updatedAt) {
      const date = new Date(dir.updatedAt);
      if (!isNaN(date.getTime())) dates.push(date);
    }

    if (dir.createdAt) {
      const date = new Date(dir.createdAt);
      if (!isNaN(date.getTime())) dates.push(date);
    }

    // Return the most recent date, or null if no valid dates
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates.map(d => d.getTime())));
  };

  /**
   * Filter Directories
   * Filters directories based on:
   * - Search query (matches directory name)
   * - Time bucket filter (filters by most recent activity: document upload, summary/report creation, or directory update)
   * 
   * Used to display filtered directory list in the UI
   */
  const filteredDirectories = directories.filter((dir: any) => {
    // Search filter
    if (search && !dir.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    // Apply time bucket filter based on most recent activity
    if (directoryTimeFilter !== "all") {
      // For shared directories, always include them (they're accessible regardless of date)
      if (dir.isShared) {
        return true;
      }

      // Get the most recent activity date (document upload, summary/report creation, or directory update)
      const mostRecentActivity = getDirectoryMostRecentActivity(dir);

      // If directory has no activity date, exclude it from filtered results
      if (!mostRecentActivity) {
        return false;
      }

      try {
        const now = new Date();
        let filterStart: Date;

        switch (directoryTimeFilter) {
          case "today":
            filterStart = new Date();
            filterStart.setHours(0, 0, 0, 0);
            break;
          case "last7":
            filterStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filterStart.setHours(0, 0, 0, 0);
            break;
          case "last15":
            filterStart = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
            filterStart.setHours(0, 0, 0, 0);
            break;
          case "last30":
            filterStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            filterStart.setHours(0, 0, 0, 0);
            break;
          case "last60":
            filterStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            filterStart.setHours(0, 0, 0, 0);
            break;
          default:
            return true;
        }

        // Filter: most recent activity date should be >= filter start date
        // Reset hours for activity date to compare dates only
        const activityDateOnly = new Date(mostRecentActivity);
        activityDateOnly.setHours(0, 0, 0, 0);

        if (activityDateOnly < filterStart) return false;
      } catch (error) {
        console.error("Error filtering directory by date:", error, dir);
        return false;
      }
    }

    return true;
  });

  // Sort filtered directories based on selected sort option
  const sortedFilteredDirectories = [...filteredDirectories].sort((a: any, b: any) => {
    if (directorySortBy === "alphabetical") {
      // Sort alphabetically ascending (A-Z)
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    } else if (directorySortBy === "lastModified") {
      // Sort by most recent activity date (newest first)
      // This considers document uploads, summary/report creation, and directory updates
      const dateA = getDirectoryMostRecentActivity(a);
      const dateB = getDirectoryMostRecentActivity(b);

      const timeA = dateA ? dateA.getTime() : 0;
      const timeB = dateB ? dateB.getTime() : 0;

      return timeB - timeA; // Descending (newest first)
    }
    return 0;
  });

  /**
   * Filter Documents
   * Filters documents based on:
   * - Search query (matches document name)
   * - Date range (startDate and endDate)
   * - Time bucket filter (today, last7, last15, last30 days)
   * 
   * Used to display filtered document list in the UI
   */
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
        `Filter: ${timeFilter}, Filter Start: ${filterStart.toLocaleDateString()}, Doc Date: ${docDate.toLocaleDateString()}, Doc Name: ${doc.name
        }, Pass: ${docDate >= filterStart}`
      );

      if (docDate < filterStart) return false;
    }

    return true;
  });

  /**
   * Handle Document Delete Click
   * Opens delete confirmation dialog for a document
   * 
   * @param doc - Document object to delete
   */
  const handleDeleteDoc = async (doc: any) => {
    setDocToDelete(doc);
    setShowDeleteDialog(true);
  };

  /**
   * Confirm Document Deletion
   * Actually deletes the document after user confirmation
   * - Deletes document via API
   * - Refreshes document list
   * - Updates directory document types
   */
  const confirmDeleteDoc = async () => {
    if (!docToDelete) return;
    setIsDeletingDocument(true);
    const directoryId = docToDelete.directoryId;
    try {
      await documentService.delete(docToDelete.id);
      toast.success("Document deleted successfully");
      fetchDocuments();
      // Update directory document types after deletion
      if (directoryId) {
        const types = await fetchDirectoryDocumentTypes(directoryId);
        setDirectoryDocumentTypes(prev => ({
          ...prev,
          [directoryId]: types
        }));
      }
      setShowDeleteDialog(false);
      setDocToDelete(null);
    } catch (error) {
      toast.error("Failed to delete document");
    } finally {
      setIsDeletingDocument(false);
    }
  };

  /**
   * Handle Document Rename Click
   * Initiates inline rename for a document
   * 
   * @param doc - Document object to rename
   */
  const handleRenameClick = (doc: any) => {
    setRenamingDocId(doc.id);
    setRenameValue(doc.name);
  };

  /**
   * Handle Document Rename Input Change
   * Updates the temporary rename value as user types
   * 
   * @param e - Input change event
   */
  const handleRenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRenameValue(e.target.value);
  };

  /**
   * Handle Document Rename Submit
   * Saves the new document name to the backend
   * - Validates that name has changed
   * - Updates document via API
   * - Refreshes document list
   * 
   * @param doc - Document object being renamed
   */
  const handleRenameSubmit = async (doc: any) => {
    if (!renameValue.trim() || renameValue === doc.name) {
      setRenamingDocId(null);
      return;
    }
    try {
      await documentService.update(doc.id, { name: renameValue.trim() });
      toast.success("Document renamed successfully");
      fetchDocuments();
      // Update directory's lastDocumentUpload time in local state
      if (doc.directoryId) {
        setDirectories((prevDirs) =>
          prevDirs.map((dir) =>
            dir.id === doc.directoryId
              ? { ...dir, lastDocumentUpload: new Date().toISOString() }
              : dir
          )
        );
      }
      // Refresh directories to get latest data from backend
      fetchAllDirectories();
    } catch (error) {
      toast.error("Failed to rename document");
    } finally {
      setRenamingDocId(null);
    }
  };

  /**
   * Handle Document Rename Keyboard Events
   * Handles Enter (submit) and Escape (cancel) keys during rename
   * 
   * @param e - Keyboard event
   * @param doc - Document object being renamed
   */
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

  // ============================================================================
  // SUMMARY ACTION HANDLERS
  // ============================================================================

  /**
   * Handle Summary Delete Click
   * Shows confirmation dialog for summary deletion
   * 
   * @param summary - Summary object to delete
   */
  const handleDeleteSummary = async (summary: any) => {
    setSummaryToDelete(summary);
    setShowDeleteSummaryDialog(true);
  };

  /**
   * Confirm Summary Deletion
   * Actually deletes the summary after user confirmation
   */
  const confirmDeleteSummary = async () => {
    if (!summaryToDelete) return;
    try {
      await summaryService.delete(summaryToDelete.id);
      toast.success("Summary deleted successfully");
      // Refresh summaries and reports for current directory if one is selected
      if (currentFolder?.id) {
        await fetchDirectorySummariesAndReports(currentFolder.id);
      }
    } catch (error) {
      toast.error("Failed to delete summary");
    } finally {
      setShowDeleteSummaryDialog(false);
      setSummaryToDelete(null);
    }
  };

  /**
   * Handle Summary Rename Click
   * Initiates inline rename for a summary
   * 
   * @param summary - Summary object to rename
   */
  const handleRenameSummaryClick = (summary: any) => {
    setRenamingSummaryId(summary.id);
    setRenameSummaryValue(summary.title || "");
  };

  /**
   * Handle Summary Rename Submit
   * Saves the new summary title to the backend
   */
  const handleRenameSummarySubmit = async (summary: any) => {
    if (!renameSummaryValue.trim() || renameSummaryValue === summary.title) {
      setRenamingSummaryId(null);
      return;
    }
    try {
      await summaryService.update(summary.id, { title: renameSummaryValue.trim() });
      toast.success("Summary renamed successfully");
      // Refresh summaries and reports for current directory if one is selected
      if (currentFolder?.id) {
        await fetchDirectorySummariesAndReports(currentFolder.id);
      }
    } catch (error) {
      toast.error("Failed to rename summary");
    } finally {
      setRenamingSummaryId(null);
    }
  };

  /**
   * Handle Summary Rename Keyboard Events
   */
  const handleRenameSummaryKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    summary: any
  ) => {
    if (e.key === "Enter") {
      handleRenameSummarySubmit(summary);
    } else if (e.key === "Escape") {
      setRenamingSummaryId(null);
    }
  };

  // ============================================================================
  // REPORT ACTION HANDLERS
  // ============================================================================

  /**
   * Handle Report Delete Click
   * Shows confirmation dialog for report deletion
   * 
   * @param report - Report object to delete
   */
  const handleDeleteReport = async (report: any) => {
    setReportToDelete(report);
    setShowDeleteReportDialog(true);
  };

  /**
   * Confirm Report Deletion
   * Actually deletes the report after user confirmation
   */
  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;
    try {
      await reportService.delete(reportToDelete.id);
      toast.success("Report deleted successfully");
      // Refresh summaries and reports for current directory if one is selected
      if (currentFolder?.id) {
        await fetchDirectorySummariesAndReports(currentFolder.id);
      }
    } catch (error) {
      toast.error("Failed to delete report");
    } finally {
      setShowDeleteReportDialog(false);
      setReportToDelete(null);
    }
  };

  /**
   * Handle Report Rename Click
   * Initiates inline rename for a report
   * 
   * @param report - Report object to rename
   */
  const handleRenameReportClick = (report: any) => {
    setRenamingReportId(report.id);
    setRenameReportValue(report.title || "");
  };

  /**
   * Handle Report Rename Submit
   * Saves the new report title to the backend
   */
  const handleRenameReportSubmit = async (report: any) => {
    if (!renameReportValue.trim() || renameReportValue === report.title) {
      setRenamingReportId(null);
      return;
    }
    try {
      await reportService.update(report.id, { title: renameReportValue.trim() });
      toast.success("Report renamed successfully");
      // Refresh summaries and reports for current directory if one is selected
      if (currentFolder?.id) {
        await fetchDirectorySummariesAndReports(currentFolder.id);
      }
    } catch (error) {
      toast.error("Failed to rename report");
    } finally {
      setRenamingReportId(null);
    }
  };

  /**
   * Handle Report Rename Keyboard Events
   */
  const handleRenameReportKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    report: any
  ) => {
    if (e.key === "Enter") {
      handleRenameReportSubmit(report);
    } else if (e.key === "Escape") {
      setRenamingReportId(null);
    }
  };

  // ============================================================================
  // DIRECTORY ACTION HANDLERS
  // ============================================================================

  /**
   * Handle Directory Rename Click
   * Initiates inline rename for a directory
   * 
   * @param dir - Directory object to rename
   */
  const handleDirectoryRenameClick = (dir: any) => {
    setRenamingDirectoryId(dir.id);
    setDirectoryRenameValue(dir.name);
  };

  /**
   * Handle Directory Rename Input Change
   * Updates the temporary rename value as user types
   * 
   * @param e - Input change event
   */
  const handleDirectoryRenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDirectoryRenameValue(e.target.value);
  };

  /**
   * Handle Directory Rename Submit
   * Saves the new directory name to the backend
   * - Validates that name has changed
   * - Updates directory via API
   * - Updates currentFolder if it's the renamed directory
   * 
   * @param dir - Directory object being renamed
   */
  const handleDirectoryRenameSubmit = async (dir: any) => {
    if (!directoryRenameValue.trim() || directoryRenameValue === dir.name) {
      setRenamingDirectoryId(null);
      return;
    }
    try {
      await directoryService.update(dir.id, { name: directoryRenameValue.trim() });
      // Update directory name in recent directories if it exists there
      const workspaceId = getCurrentWorkspace();
      if (workspaceId) {
        const { updateDirectoryName } = await import("@/utils/directoryTracking");
        updateDirectoryName(dir.id, directoryRenameValue.trim(), workspaceId);
        // Dispatch event to refresh recent directories in sidebar
        window.dispatchEvent(new CustomEvent("directoryOpened"));
      }
      toast.success("Directory renamed successfully");
      fetchAllDirectories();
      // If this is the current folder, update it
      if (currentFolder?.id === dir.id) {
        setCurrentFolder({ id: dir.id, name: directoryRenameValue.trim() });
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to rename directory");
    } finally {
      setRenamingDirectoryId(null);
    }
  };

  /**
   * Handle Directory Rename Keyboard Events
   * Handles Enter (submit) and Escape (cancel) keys during rename
   * 
   * @param e - Keyboard event
   * @param dir - Directory object being renamed
   */
  const handleDirectoryRenameKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    dir: any
  ) => {
    if (e.key === "Enter") {
      handleDirectoryRenameSubmit(dir);
    } else if (e.key === "Escape") {
      setRenamingDirectoryId(null);
    }
  };

  /**
   * Handle Directory Delete Click
   * Opens delete confirmation dialog for a directory
   * 
   * @param dir - Directory object to delete
   */
  const handleDeleteDirectory = async (dir: any) => {
    setDirectoryToDelete(dir);
    setShowDeleteDirectoryDialog(true);
  };

  /**
   * Confirm Directory Deletion
   * Actually deletes the directory and all its documents after user confirmation
   * - Deletes directory via API (cascades to documents)
   * - Clears currentFolder if it was the deleted directory
   * - Refreshes directory list
   */
  const confirmDeleteDirectory = async () => {
    if (!directoryToDelete) return;
    setIsDeletingDirectory(true);
    try {
      await directoryService.delete(directoryToDelete.id);
      // Remove directory from recent directories if it exists there
      const workspaceId = getCurrentWorkspace();
      if (workspaceId) {
        const { removeDirectoryFromRecent } = await import("@/utils/directoryTracking");
        removeDirectoryFromRecent(directoryToDelete.id, workspaceId);
        // Dispatch event to refresh recent directories in sidebar
        window.dispatchEvent(new CustomEvent("directoryOpened"));
      }
      toast.success("Directory deleted successfully");
      fetchAllDirectories();
      // If this was the current folder, clear it
      if (currentFolder?.id === directoryToDelete.id) {
        setCurrentFolder(null);
      }
      setShowDeleteDirectoryDialog(false);
      setDirectoryToDelete(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete directory");
    } finally {
      setIsDeletingDirectory(false);
    }
  };

  /**
   * Open Move Document Dialog
   * Opens the dialog to move a document to a different directory
   * 
   * @param doc - Document object to move
   */
  const openMoveDialog = (doc: any) => {
    setMovingDocId(doc.id);
    setMovingDocDirectoryId(doc.directoryId ?? null);
  };

  /**
   * Handle Document Move Selection
   * Moves a document to the selected destination directory
   * 
   * @param destDirectoryId - ID of destination directory (null for root)
   */
  const handleMoveSelect = async (destDirectoryId: string | null) => {
    if (!movingDocId) return;
    const movingDoc = documents.find((d) => d.id === movingDocId);
    await documentService.update(movingDocId, { directoryId: destDirectoryId });
    setMovingDocId(null);
    setMovingDocDirectoryId(null);
    fetchDocuments();
    // Update both source and destination directory's lastDocumentUpload time
    const now = new Date().toISOString();
    setDirectories((prevDirs) =>
      prevDirs.map((dir) =>
        (movingDoc?.directoryId && dir.id === movingDoc.directoryId) ||
          (destDirectoryId && dir.id === destDirectoryId)
          ? { ...dir, lastDocumentUpload: now }
          : dir
      )
    );
    // Refresh directories to get latest data from backend
    fetchAllDirectories();
  };

  /**
   * Handle Navigate to Existing Document
   * Navigates to the document view after successful upload
   * Used in the upload success modal
   */
  const handleNavigateToExisting = () => {
    if (uploadedDoc) {
      navigate(`/doc/${uploadedDoc.namespace || uploadedDoc.id}`);
      setShowSuccessModal(false);
      setUploadedDoc(null);
    }
  };

  /**
   * Handle Close Upload Success Modal
   * Closes the upload success modal and clears uploaded document state
   */
  const handleCloseExistingModal = () => {
    setShowSuccessModal(false);
    setUploadedDoc(null);
  };

  // ============================================================================
  // SIDEBAR HANDLERS
  // ============================================================================

  /**
   * Handle Sidebar Back Navigation
   * Navigates back to dashboard when back button is clicked in sidebar
   */
  const handleSidebarBack = () => {
    navigate("/dashboard");
  };

  /**
   * Handle Sidebar Close
   * Closes the chat sidebar
   */
  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  /**
   * Handle Document Selection from Sidebar
   * Navigates to document view when document is selected from sidebar
   * 
   * @param doc - Selected document object
   */
  const handleSelectDocument = (doc: any) => {
    if (doc) {
      navigate(`/doc/${doc.id}`);
    }
    setSidebarOpen(false);
  };

  /**
   * Handle Chat Selection from Sidebar
   * Navigates to document view with specific chat when chat is selected
   * 
   * @param chat - Selected chat object
   */
  const handleSelectChat = (chat: any) => {
    if (chat) {
      navigate(`/doc/${chat.documentId}?chatId=${chat.id}`);
    }
    setSidebarOpen(false);
  };

  /**
   * Handle New Chat
   * Closes sidebar when new chat is initiated
   */
  const handleNewChat = () => {
    setSidebarOpen(false);
  };

  /**
   * Handle Date Range Filter Apply
   * Applies the selected date range filter to documents
   */
  const handleDateRangeApply = () => {
    if (startDate || endDate) {
      setIsDateRangeApplied(true);
    }
    setShowDatePicker(false);
  };

  /**
   * Handle Date Range Filter Clear
   * Clears the date range filter and resets to show all documents
   */
  const handleDateRangeClear = () => {
    setStartDate("");
    setEndDate("");
    setIsDateRangeApplied(false);
  };

  /**
   * Effect: Handle Click Outside to Close UI Elements
   * Closes sidebar, time filter, and upload dropdown when clicking outside
   * Improves UX by automatically closing overlays
   */
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

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div
      className="min-h-screen bg-white flex flex-col font-sans relative"
      style={{ fontFamily: "Inter, Arial, sans-serif" }}
    >
      {/* 
        Upload/Processing Overlay
        Full-screen overlay that blocks UI during file upload and processing
        Prevents user from navigating away or performing other actions
      */}
      {isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-16 w-16 animate-spin text-[#4B2A06]" />
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Processing Document
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Your document is being uploaded and processed through our system.
                </p>
                <p className="text-xs text-gray-500">
                  Please do not close this window or refresh the page.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>This may take a few moments...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 
        Top Navigation Bar
        Provides search functionality and navigation controls
      */}
      <Navbar
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        onSidebarOpen={() => setSidebarOpen(true)}
        sidebarOpen={sidebarOpen}
      />

      {/* Bottom split: left sidebar, right content */}
      <div className="flex-1 flex flex-row min-w-0">
        {/* 
          Left Sidebar - Folder Navigation
          Displays workspace list and recent directories
          Allows quick navigation to frequently accessed directories
        */}
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
          {/* 
            Chat Sidebar
            Slide-out sidebar for chat history and document navigation
            Opens from the left side when hamburger menu is clicked
          */}
          <div
            className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 ${sidebarOpen ? "w-[15%] min-w-[200px]" : "w-0 min-w-0 max-w-0"
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

          {/* 
            Main Content Area
            Contains the directory/document list and all action buttons
            Adjusts width when sidebar is open
          */}
          <main
            className={`flex-1 flex flex-col pt-[1.5vw] pr-[1.5vw] pb-[4vh] relative max-w-[77vw] mx-auto w-full min-h-0 transition-all duration-300 ${sidebarOpen ? "ml-[15%] max-w-[77vw]" : ""
              }`}
          >
            {/* 
              Header Section
              Contains title, admin navigation (for admins), and upload button
            */}
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

                {/* 
                  Upload Button Section
                  Smart upload button that adapts based on directory state:
                  - If both DRHP and RHP exist: disabled button
                  - If only DRHP exists: "Upload RHP" button
                  - If only RHP exists: "Upload DRHP" button
                  - If neither exists: dropdown with both options
                  - If no directory selected: "Create New Folder" button
                */}
                <div className="flex flex-col items-end relative">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf"
                    className="hidden outline-none"
                    disabled={isUploading}
                  />
                  {currentFolder?.id ? (
                    // Inside a directory - show upload buttons based on what's available
                    <div className="flex items-center gap-2">
                      {hasDrhpInDirectory && hasRhpInDirectory ? (
                        // Both DRHP and RHP exist - disable the button
                        <button
                          className="flex items-center gap-[0.5vw] bg-gray-400 text-white font-semibold px-4 py-2 rounded-lg shadow-lg text-lg cursor-not-allowed opacity-60"
                          disabled={true}
                          title="Both DRHP and RHP documents already exist in this directory"
                        >
                          <Upload className="h-4 w-4" />
                          Upload Document
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      ) : hasDrhpInDirectory && !hasRhpInDirectory ? (
                        // Only DRHP exists - show direct Upload RHP button
                        <button
                          className="flex items-center gap-[0.5vw] bg-[#4B2A06] text-white font-semibold px-4 py-2 rounded-lg shadow-lg text-lg transition hover:bg-[#3A2004] focus:outline-none"
                          onClick={() => {
                            setSelectedUploadType("RHP");
                            fileInputRef.current?.click();
                          }}
                          disabled={isUploading}
                          title="Upload RHP document"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-[1.5vw] w-[1.5vw] min-w-[24px] min-h-[24px] animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Upload RHP
                            </>
                          )}
                        </button>
                      ) : hasRhpInDirectory && !hasDrhpInDirectory ? (
                        // Only RHP exists - show direct Upload DRHP button
                        <button
                          className="flex items-center gap-[0.5vw] bg-[#4B2A06] text-white font-semibold px-4 py-2 rounded-lg shadow-lg text-lg transition hover:bg-[#3A2004] focus:outline-none"
                          onClick={() => {
                            setSelectedUploadType("DRHP");
                            fileInputRef.current?.click();
                          }}
                          disabled={isUploading}
                          title="Upload DRHP document"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-[1.5vw] w-[1.5vw] min-w-[24px] min-h-[24px] animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Upload DRHP
                            </>
                          )}
                        </button>
                      ) : (
                        // Neither exists - show dropdown with both options
                        <div className="relative upload-dropdown-container">
                          <button
                            className="flex items-center gap-[0.5vw] bg-[#4B2A06] text-white font-semibold px-4 py-2 rounded-lg shadow-lg text-lg transition hover:bg-[#3A2004] focus:outline-none"
                            onClick={() => setShowUploadDropdown(!showUploadDropdown)}
                            disabled={isUploading}
                            title="Upload document"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="h-[1.5vw] w-[1.5vw] min-w-[24px] min-h-[24px] animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4" />
                                Upload Document
                                <ChevronDown className="h-4 w-4" />
                              </>
                            )}
                          </button>
                          {showUploadDropdown && (
                            <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px]">
                              <button
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                onClick={() => {
                                  setSelectedUploadType("DRHP");
                                  setShowUploadDropdown(false);
                                  fileInputRef.current?.click();
                                }}
                              >
                                <FileText className="h-4 w-4" />
                                Upload DRHP
                              </button>
                              <button
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                onClick={() => {
                                  setSelectedUploadType("RHP");
                                  setShowUploadDropdown(false);
                                  fileInputRef.current?.click();
                                }}
                              >
                                <FileText className="h-4 w-4" />
                                Upload RHP
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Not in a directory - show Create New Folder button
                    <div className="relative">
                      <button
                        className="flex items-center gap-[0.5vw] bg-[#4B2A06] text-white font-semibold px-4 py-2 rounded-lg shadow-lg text-lg transition hover:bg-[#3A2004] focus:outline-none"
                        onClick={() => {
                          // Show Create New Folder popup with directory selector
                          setShowDirectorySelector(true);
                          setPendingUpload(null);
                        }}
                        disabled={isUploading}
                        title="Create new folder and upload document"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-[1.5vw] w-[1.5vw] min-w-[24px] min-h-[24px] animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>

                            Create New
                            <Plus className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* 
              Filters and View Controls
              Left: Back button (in directory) or time filter (directory list)
              Right: View mode toggle (list/card)
            */}
            <div className="flex justify-between items-center mb-[2vw]">
              {/* 
                Left Side Controls
                - Back button: shown when inside a directory (navigates to directory list)
                - Time filter: shown when viewing directory list (filters by creation date)
              */}
              <div className="flex items-center gap-4">
                {currentFolder?.name ? (
                  // Show back button when inside a directory
                  <button
                    className="flex items-center bg-[#F3F4F6] gap-[0.5vw] text-[#5A6473] font-semibold rounded-lg px-[1.2vw] py-[0.5vw] text-sm hover:text-[#4B2A06]"
                    onClick={() => setCurrentFolder(null)}
                    title="Back to all directories"
                  >
                    <ArrowLeft className="h-[0.9vw] w-[0.9vw] min-w-[14px] min-h-[14px]" />
                    <div className="flex items-center bg-[#F3F4F6] text-[#4B2A06] font-semibold rounded-lg text-base">
                      <span
                        className="truncate max-w-[18vw]"
                        title={currentFolder.name}
                      >
                        {currentFolder.name}
                      </span>
                    </div>
                  </button>
                ) : (
                  // Show time bucket filter and sort options when viewing directories
                  <div className="flex items-center gap-2">
                    {/* Time Filter Dropdown */}
                    <div className="relative flex items-center" style={{ zIndex: 50 }}>
                      {(() => {
                        const filterOptions = [
                          { value: "all", label: "All Directories" },
                          { value: "today", label: "Today" },
                          { value: "last7", label: "Last 7 days" },
                          { value: "last15", label: "Last 15 days" },
                          { value: "last30", label: "Last 30 days" },
                          { value: "last60", label: "Last 60 days" }
                        ];
                        const selectedOption = filterOptions.find(opt => opt.value === directoryTimeFilter) || filterOptions[0];

                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setShowDirectoryTimeFilter(!showDirectoryTimeFilter);
                              }}
                              className={`flex items-center gap-[0.5vw] font-semibold px-[1.5vw] py-[0.5vw] rounded-lg text-[#5A6473] transition-colors cursor-pointer relative ${directoryTimeFilter === 'all'
                                ? 'bg-[#F3F4F6] text-[#5A6473] hover:bg-[#E5E7EB]'
                                : 'bg-[#F3F4F6] text-[#5A6473] hover:bg-[#E5E7EB]'
                                }`}
                              style={{
                                paddingRight: '2.5rem',
                              }}
                            >
                              <span>{selectedOption.label}</span>
                              {showDirectoryTimeFilter ? (
                                <ChevronUp className="h-4 w-4 absolute right-2" />
                              ) : (
                                <ChevronDown className="h-4 w-4 absolute right-2" />
                              )}
                            </button>

                            {/* Dropdown Menu */}
                            {showDirectoryTimeFilter && (
                              <>
                                {/* Backdrop to close on outside click */}
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setShowDirectoryTimeFilter(false)}
                                />
                                {/* Dropdown Options */}
                                <div
                                  className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px]"
                                  style={{ bottom: 'auto' }}
                                >
                                  {filterOptions.map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => {
                                        setDirectoryTimeFilter(option.value);
                                        setShowDirectoryTimeFilter(false);
                                      }}
                                      className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${directoryTimeFilter === option.value
                                        ? 'bg-[#F3F4F6] text-[#4B2A06]'
                                        : 'text-[#5A6473] hover:bg-[#F3F4F6]'
                                        } ${option.value === filterOptions[0].value ? 'rounded-t-lg' : ''} ${option.value === filterOptions[filterOptions.length - 1].value ? 'rounded-b-lg' : ''
                                        }`}
                                    >
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>

                  </div>
                )}
              </div>

              {/* 
                View Mode Toggle
                Allows switching between list view and card view
                Applies to both directories and documents
              */}
              <div className="flex items-center gap-[0.5vw]">
                <div className="flex bg-[#F3F4F6] rounded-lg p-1">
                  <button
                    className={`flex items-center gap-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${viewMode === "list"
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
                    className={`flex items-center gap-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${viewMode === "card"
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
            {/* 
              Main Content Scrollable Area
              Displays either directories (when no folder selected) or documents (when folder selected)
              Scrollable container for long lists
            */}
            <div className="flex-1 min-h-0">
              <div
                className={`${user?.role === "admin" ? "h-[68vh]" : "h-[67vh]"
                  } overflow-y-auto`}
              >
                {(currentFolder?.id ? loading : directoriesLoading) ? (
                  <div className="flex justify-center items-center h-[10vh] text-lg text-muted-foreground">
                    {currentFolder?.id ? "Loading documents..." : "Loading directories..."}
                  </div>
                ) : error ? (
                  <div className="flex justify-center items-center h-[10vh] text-lg text-destructive">
                    {error}
                  </div>
                ) : (
                  <>
                    {/* 
                      DIRECTORY VIEW
                      Shown when no specific directory is selected
                      Displays all root-level directories in either card or list view
                    */}
                    {!currentFolder?.id ? (
                      // Card View for Directories
                      viewMode === "card" ? (
                        <div className="grid grid-cols-3 gap-[1.5vw] mb-[1vw]">
                          {sortedFilteredDirectories.length === 0 ? (
                            <div className="col-span-3 text-center text-muted-foreground">
                              No directories found.
                            </div>
                          ) : (
                            sortedFilteredDirectories.map((dir) => (
                              <div
                                key={dir.id}
                                className="flex flex-col items-start bg-[#F3F4F6] justify-between rounded-xl p-[1vw] min-w-[180px] min-h-[150px] w-full cursor-pointer hover:bg-[#ECECEC] transition relative"
                                onClick={() => {
                                  // Track directory open (workspace-specific)
                                  const workspaceId = getCurrentWorkspace();
                                  trackDirectoryOpen(dir.id, dir.name, workspaceId);
                                  // Dispatch event to refresh recent directories in sidebar
                                  window.dispatchEvent(new CustomEvent("directoryOpened"));
                                  setCurrentFolder({ id: dir.id, name: dir.name });
                                  // Refresh documents for this directory
                                  fetchDocuments();
                                }}
                              >
                                <div className="flex w-full justify-between items-start">
                                  <div className="flex-1 min-w-0">
                                    <FolderIcon className="h-4 w-4 text-[#4B2A06] mb-[1vw]" />
                                  </div>
                                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    {/* Compare button - show different icons for linked vs unlinked */}
                                    <button
                                      className={`text-[#4B2A06] hover:text-[#3A2004] p-1 flex items-center justify-center ${compareLoading ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!compareLoading) {
                                          handleDirectoryCompareClick(dir);
                                        }
                                      }}
                                      title={directoryLinkedStatus[dir.id] ? "View comparison report" : "Compare documents in this directory"}
                                      disabled={compareLoading}
                                    >
                                      {directoryLinkedStatus[dir.id] ? (
                                        // Linked documents icon - view icon for linked documents
                                        <img
                                          className="h-3 w-3 object-contain"
                                          src="https://img.icons8.com/pastel-glyph/128/document--v1.png"
                                          alt="view"
                                          style={{ display: 'block', maxWidth: '100%', height: 'auto', minWidth: '12px', minHeight: '12px' }}
                                          onError={(e) => {
                                            console.log('Image failed to load:', e);
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        // Unlinked documents icon - original compare icon
                                        <img
                                          className="h-3 w-3 object-contain"
                                          src="https://img.icons8.com/ios/50/compare.png"
                                          alt="compare"
                                          style={{ display: 'block', maxWidth: '100%', height: 'auto', minWidth: '12px', minHeight: '12px' }}
                                          onError={(e) => {
                                            console.log('Image failed to load:', e);
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      )}
                                    </button>
                                    <button
                                      className="text-[#4B2A06] hover:text-[#3A2004] p-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDirectoryRenameClick(dir);
                                      }}
                                      title="Rename directory"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                      className="text-[#4B2A06] hover:text-[#3A2004] p-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShareDirectoryId(dir.id);
                                      }}
                                      title="Share directory"
                                    >
                                      <Share2 className="h-3 w-3" />
                                    </button>
                                    {user?.role === "admin" && (
                                      <button
                                        className="text-[#4B2A06] hover:text-[#3A2004] p-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setMovingDirectoryToWorkspaceId(dir.id);
                                          setMovingDirectoryToWorkspaceName(dir.name);
                                        }}
                                        title="Move to workspace (Admin only)"
                                      >
                                        <Building2 className="h-3 w-3" />
                                      </button>
                                    )}
                                    <button
                                      className="text-[#4B2A06] hover:text-red-600 p-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteDirectory(dir);
                                      }}
                                      title="Delete directory"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                                {renamingDirectoryId === dir.id ? (
                                  <div className="flex items-center gap-2 w-full mb-1" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      className="font-semibold text-[#232323] border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:outline-none focus:ring-0 focus:border-gray-300 flex-1"
                                      value={directoryRenameValue}
                                      autoFocus
                                      onChange={handleDirectoryRenameChange}
                                      onBlur={() => handleDirectoryRenameSubmit(dir)}
                                      onKeyDown={(e) => handleDirectoryRenameKeyDown(e, dir)}
                                    />
                                    <button
                                      className="text-gray-400 hover:text-red-500"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRenamingDirectoryId(null);
                                      }}
                                      title="Cancel rename"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-[#232323] max-w-full truncate block" style={{ maxWidth: "220px" }}>
                                      {dir.name}
                                    </span>
                                    {dir.isShared && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1 flex-shrink-0" title="Shared directory">
                                        <Share2 className="h-3 w-3" />
                                        Shared
                                      </span>
                                    )}
                                  </div>
                                )}
                                {directoryDocumentTypes[dir.id] && (
                                  <div className="flex items-center gap-1 mb-1 flex-wrap ">
                                    {directoryDocumentTypes[dir.id].hasDrhp && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#ECE9E2] text-[#4B2A06] flex items-center gap-1">
                                        DRHP
                                        <CheckCircle className="h-3 w-3" />
                                      </span>
                                    )}
                                    {directoryDocumentTypes[dir.id].hasRhp && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#ECE9E2] text-[#4B2A06] flex items-center gap-1">
                                        RHP
                                        <CheckCircle className="h-3 w-3" />
                                      </span>
                                    )}
                                    {/* Show reports count if available */}
                                    {directoryReports[dir.id] > 0 && (
                                      <span
                                        className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1 cursor-pointer hover:bg-blue-200"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Find DRHP document in this directory and navigate to compare page
                                          documentService.getAll({ directoryId: dir.id }).then((docs) => {
                                            const drhpDoc = docs.find((d: any) => d.type === "DRHP" && d.relatedRhpId);
                                            if (drhpDoc) {
                                              navigate(`/compare/${drhpDoc.id}`);
                                            }
                                          });
                                        }}
                                        title={`${directoryReports[dir.id]} comparison report${directoryReports[dir.id] > 1 ? 's' : ''} available`}
                                      >
                                        <BarChart3 className="h-3 w-3" />
                                        {directoryReports[dir.id]} Report{directoryReports[dir.id] > 1 ? 's' : ''}
                                      </span>
                                    )}
                                    {/* Show summaries count if available */}
                                    {directorySummaries[dir.id] > 0 && (
                                      <span
                                        className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1"
                                        title={`${directorySummaries[dir.id]} summar${directorySummaries[dir.id] > 1 ? 'ies' : 'y'} available`}
                                      >
                                        <FileText className="h-3 w-3" />
                                        {directorySummaries[dir.id]} Summar{directorySummaries[dir.id] > 1 ? 'ies' : 'y'}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        // List View for Directories
                        <div className="bg-white">
                          {/* 
                            Sticky Table Header
                            Remains visible while scrolling through directory list
                            Shows column headers: Name, Documents, Last modified, Actions
                          */}
                          <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 rounded-lg px-6 py-3">
                            <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-600">
                              <div className="col-span-5">Name</div>
                              <div className="col-span-4">Documents</div>
                              <div className="col-span-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Toggle between the two sort options
                                    setDirectorySortBy(directorySortBy === "lastModified" ? "alphabetical" : "lastModified");
                                  }}
                                  className="flex items-center gap-1.5 hover:text-[#4B2A06] transition-colors group"
                                  title={directorySortBy === "lastModified" ? "Click to sort A-Z" : "Click to sort by Last Modified"}
                                >
                                  <span className="select-none">
                                    {directorySortBy === "lastModified" ? "Last modified" : "Sort: A-Z"}
                                  </span>
                                  <div className="flex flex-col items-center justify-center gap-0">
                                    <ChevronUp
                                      className={`h-3 w-3  font-bold transition-colors ${directorySortBy === "lastModified"
                                        ? 'text-[#4B2A06]'
                                        : 'text-gray-400'
                                        }`}
                                    />
                                    <ChevronDown
                                      className={`h-3 w-3 font-bold transition-colors -mt-0.5 ${directorySortBy === "alphabetical"
                                        ? 'text-[#4B2A06]'
                                        : 'text-gray-400'
                                        }`}
                                    />
                                  </div>
                                </button>
                              </div>
                              <div className="col-span-1 text-left">Actions</div>
                            </div>
                          </div>
                          {/* Scrollable Content */}
                          <div>
                            {sortedFilteredDirectories.length === 0 ? (
                              <div className="text-center text-muted-foreground py-8">
                                No directories found.
                              </div>
                            ) : (
                              sortedFilteredDirectories.map((dir) => (
                                <div
                                  key={dir.id}
                                  className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 cursor-pointer transition-colors"
                                  onClick={() => {
                                    // Track directory open (workspace-specific)
                                    const workspaceId = getCurrentWorkspace();
                                    trackDirectoryOpen(dir.id, dir.name, workspaceId);
                                    // Dispatch event to refresh recent directories in sidebar
                                    window.dispatchEvent(new CustomEvent("directoryOpened"));
                                    setCurrentFolder({ id: dir.id, name: dir.name });
                                    // Refresh documents for this directory
                                    fetchDocuments();
                                  }}
                                >
                                  <div className="col-span-5 flex items-center gap-3">
                                    <FolderIcon className="h-4 w-4 text-[#4B2A06]" />
                                    {renamingDirectoryId === dir.id ? (
                                      <div className="flex items-center gap-2">
                                        <input
                                          className="font-medium text-gray-900 border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:outline-none focus:ring-0 focus:border-gray-300"
                                          value={directoryRenameValue}
                                          autoFocus
                                          onClick={(e) => e.stopPropagation()}
                                          onFocus={(e) => e.stopPropagation()}
                                          onChange={handleDirectoryRenameChange}
                                          onBlur={() => handleDirectoryRenameSubmit(dir)}
                                          onKeyDown={(e) => handleDirectoryRenameKeyDown(e, dir)}
                                        />
                                        <button
                                          className="text-gray-400 hover:text-red-500"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setRenamingDirectoryId(null);
                                          }}
                                          title="Cancel rename"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 truncate">{dir.name}</span>
                                        {dir.isShared && (
                                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1" title="Shared directory">
                                            <Share2 className="h-3 w-3" />
                                            Shared
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="col-span-4 flex items-center gap-2 flex-wrap">
                                    {directoryDocumentTypes[dir.id] && (
                                      <div className="flex items-center gap-1 flex-wrap">
                                        {directoryDocumentTypes[dir.id].hasDrhp && (
                                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#ECE9E2] text-[#4B2A06] flex items-center gap-1">
                                            DRHP
                                            <CheckCircle className="h-3 w-3" />
                                          </span>
                                        )}
                                        {directoryDocumentTypes[dir.id].hasRhp && (
                                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#ECE9E2] text-[#4B2A06] flex items-center gap-1">
                                            RHP
                                            <CheckCircle className="h-3 w-3" />
                                          </span>
                                        )}
                                        {/* Show reports count if available */}
                                        {directoryReports[dir.id] > 0 && (
                                          <span
                                            className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1 cursor-pointer hover:bg-blue-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // Find DRHP document in this directory and navigate to compare page
                                              documentService.getAll({ directoryId: dir.id }).then((docs) => {
                                                const drhpDoc = docs.find((d: any) => d.type === "DRHP" && d.relatedRhpId);
                                                if (drhpDoc) {
                                                  navigate(`/compare/${drhpDoc.id}`);
                                                }
                                              });
                                            }}
                                            title={`${directoryReports[dir.id]} comparison report${directoryReports[dir.id] > 1 ? 's' : ''} available`}
                                          >
                                            <BarChart3 className="h-3 w-3" />
                                            {directoryReports[dir.id]} Report{directoryReports[dir.id] > 1 ? 's' : ''}
                                          </span>
                                        )}
                                        {/* Show summaries count if available */}
                                        {directorySummaries[dir.id] > 0 && (
                                          <span
                                            className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1"
                                            title={`${directorySummaries[dir.id]} summar${directorySummaries[dir.id] > 1 ? 'ies' : 'y'} available`}
                                          >
                                            <FileText className="h-3 w-3" />
                                            {directorySummaries[dir.id]} Summar{directorySummaries[dir.id] > 1 ? 'ies' : 'y'}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="col-span-2 flex items-center">
                                    <span className="text-sm text-gray-600">
                                      {(() => {
                                        const mostRecentActivity = getDirectoryMostRecentActivity(dir);
                                        return mostRecentActivity ? mostRecentActivity.toLocaleDateString() : '-';
                                      })()}
                                    </span>
                                  </div>
                                  <div className="col-span-1 flex items-center justify-end gap-1 relative">
                                    {/* Compare button - show different icons for linked vs unlinked */}
                                    <button
                                      className={`text-[#4B2A06] hover:text-[#3A2004] p-1 flex items-center justify-center ${compareLoading ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!compareLoading) {
                                          handleDirectoryCompareClick(dir);
                                        }
                                      }}
                                      title={directoryLinkedStatus[dir.id] ? "View comparison report" : "Compare documents in this directory"}
                                      disabled={compareLoading}
                                    >
                                      {directoryLinkedStatus[dir.id] ? (
                                        // Linked documents icon - view icon for linked documents
                                        <img
                                          className="h-4 w-4 object-contain"
                                          src="https://img.icons8.com/pastel-glyph/128/document--v1.png"
                                          alt="view"
                                          style={{ display: 'block', maxWidth: '100%', height: 'auto', minWidth: '12px', minHeight: '12px' }}
                                          onError={(e) => {
                                            console.log('Image failed to load:', e);
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        // Unlinked documents icon - original compare icon
                                        <img
                                          className="h-4 w-4 object-contain"
                                          src="https://img.icons8.com/ios/50/compare.png"
                                          alt="compare"
                                          style={{ display: 'block', maxWidth: '100%', height: 'auto', minWidth: '12px', minHeight: '12px' }}
                                          onError={(e) => {
                                            console.log('Image failed to load:', e);
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      )}
                                    </button>

                                    {/* Delete button - always visible */}
                                    <button
                                      className="text-[#4B2A06] hover:text-red-600 p-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteDirectory(dir);
                                      }}
                                      title="Delete directory"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>

                                    {/* 3-dot menu button */}
                                    <div className="relative directory-menu-container">
                                      <button
                                        className="text-[#4B2A06] hover:text-[#3A2004] p-1 flex items-center justify-center"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenDirectoryMenuId(openDirectoryMenuId === dir.id ? null : dir.id);
                                        }}
                                        title="More options"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </button>

                                      {/* Dropdown menu */}
                                      {openDirectoryMenuId === dir.id && (
                                        <div
                                          className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="py-1">
                                            <button
                                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenDirectoryMenuId(null);
                                                handleDirectoryRenameClick(dir);
                                              }}
                                            >
                                              <Pencil className="h-4 w-4" />
                                              <span>Rename</span>
                                            </button>
                                            <button
                                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenDirectoryMenuId(null);
                                                setShareDirectoryId(dir.id);
                                              }}
                                            >
                                              <Share2 className="h-4 w-4" />
                                              <span>Share</span>
                                            </button>
                                            {user?.role === "admin" && (
                                              <button
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setOpenDirectoryMenuId(null);
                                                  setMovingDirectoryToWorkspaceId(dir.id);
                                                  setMovingDirectoryToWorkspaceName(dir.name);
                                                }}
                                              >
                                                <Building2 className="h-4 w-4" />
                                                <span>Move to workspace</span>
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>


                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )
                    ) : (
                      /* 
                        DOCUMENT VIEW
                        Shown when a specific directory is selected
                        Displays all documents, summaries, and reports in that directory
                        All items shown together in the same list/card view
                      */
                      <>
                        {viewMode === "card" ? (
                          // Card View for Documents, Summaries, and Reports
                          <div className="grid grid-cols-4 gap-[1.5vw] mb-[1vw]">
                            {/* Combine documents, summaries, and reports into one array for display */}
                            {(() => {
                              // Create items array with type indicator
                              const allItems: any[] = [
                                ...(filteredDocs || []).map((doc: any) => ({ ...doc, itemType: 'document' })),
                                ...(currentDirectorySummaries || []).map((summary: any) => ({ ...summary, itemType: 'summary' })),
                                ...(currentDirectoryReports || []).map((report: any) => ({ ...report, itemType: 'report' }))
                              ];

                              // Sort by date (newest first)
                              allItems.sort((a: any, b: any) => {
                                const dateA = new Date(a.updatedAt || a.uploadedAt || 0).getTime();
                                const dateB = new Date(b.updatedAt || b.uploadedAt || 0).getTime();
                                return dateB - dateA;
                              });

                              if (allItems.length === 0) {
                                return (
                                  <div className="col-span-4 text-center text-muted-foreground">
                                    No items found.
                                  </div>
                                );
                              }

                              return allItems.map((item) => {
                                // Render document
                                if (item.itemType === 'document') {
                                  const doc = item;
                                  return (
                                    <div
                                      key={doc.id}
                                      ref={(el) => (docRefs.current[doc.id] = el)}
                                      className={`flex flex-col items-start bg-[#F3F4F6] rounded-xl p-[1vw] min-w-[180px] min-h-[110px] w-full cursor-pointer hover:bg-[#ECECEC] transition relative
                                    ${selectedDoc && selectedDoc.id === doc.id
                                          ? "ring-2 ring-[#4B2A06] bg-[#ECECEC]"
                                          : ""
                                        }
                                    ${highlightedDocId === doc.id
                                          ? "ring-4 ring-orange-400 bg-yellow-100 animate-pulse"
                                          : ""
                                        }
                                  `}
                                      onClick={() => {
                                        if (currentFolder) {
                                          localStorage.setItem("currentFolder", JSON.stringify(currentFolder));
                                        }
                                        navigate(`/doc/${doc.id || doc.namespace}`);
                                      }}
                                      onAnimationEnd={() => {
                                        if (highlightedDocId === doc.id)
                                          setHighlightedDocId(null);
                                      }}
                                    >
                                      <div className="flex w-full justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                          <FileText className="h-3 w-3 text-[#4B2A06] mb-[1vw]" />
                                        </div>
                                        <div className="flex">
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
                                            <FolderUpIcon className="h-3 w-3" />
                                          </button>
                                          <button
                                            className="text-muted-foreground hover:text-destructive p-[0.3vw]"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteDoc(doc);
                                            }}
                                            title="Delete document"
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
                                            onClick={(e) => e.stopPropagation()}
                                            onFocus={(e) => e.stopPropagation()}
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
                                        {doc.size || (doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : "")}
                                      </span>
                                      <div className="flex items-center justify-between w-full mt-[0.5vw]">
                                        <span className="text-[#A1A1AA] text-xs">
                                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ""}
                                        </span>
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs px-2 py-1 mx-1 rounded-full bg-[#ECE9E2] text-[#4B2A06]">{doc.type}</span>
                                          {(doc.relatedRhpId || doc.relatedDrhpId) && (
                                            <span
                                              className="text-sm p-1.5 rounded-full bg-green-800 text-white flex items-center gap-1 cursor-pointer"
                                              title={doc.type === "DRHP" ? "Linked with RHP" : "Linked with DRHP"}
                                            >
                                              <CheckCircle className="h-3 w-3 " />
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                // Render summary
                                if (item.itemType === 'summary') {
                                  const summary = item;
                                  const doc = documents.find((d: any) => d.id === summary.documentId);
                                  return (
                                    <div
                                      key={`summary-${summary.id}`}
                                      className="flex flex-col items-start bg-[#F3F4F6] rounded-xl p-[1vw] min-w-[180px] min-h-[110px] w-full cursor-pointer hover:bg-[#ECECEC] transition relative border-l-4 border-l-green-500"
                                      onClick={() => {
                                        setSelectedSummaryId(summary.id);
                                        setShowSummaryModal(true);
                                      }}
                                    >
                                      <div className="flex w-full justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                          <FileText className="h-3 w-3 text-green-600 mb-[1vw]" />
                                        </div>
                                        <div className="flex" onClick={(e) => e.stopPropagation()}>
                                          <button
                                            className="text-muted-foreground hover:text-[#4B2A06] p-[0.3vw]"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRenameSummaryClick(summary);
                                            }}
                                            title="Rename summary"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </button>
                                          <button
                                            className="text-muted-foreground hover:text-red-600 p-[0.3vw]"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteSummary(summary);
                                            }}
                                            title="Delete summary"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                      {renamingSummaryId === summary.id ? (
                                        <input
                                          type="text"
                                          value={renameSummaryValue}
                                          onChange={(e) => setRenameSummaryValue(e.target.value)}
                                          onBlur={() => handleRenameSummarySubmit(summary)}
                                          onKeyDown={(e) => handleRenameSummaryKeyDown(e, summary)}
                                          onClick={(e) => e.stopPropagation()}
                                          className="w-full px-2 py-1 text-sm font-semibold border border-[#4B2A06] rounded mb-1"
                                          autoFocus
                                        />
                                      ) : (
                                        <span className="font-semibold text-[#232323] mb-1 max-w-full truncate block" style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                          {summary.title || 'Untitled Summary'}
                                        </span>
                                      )}
                                      {doc && (
                                        <span className="text-xs text-gray-500 truncate block mb-1">
                                          {doc.name}
                                        </span>
                                      )}
                                      <div className="flex items-center justify-between w-full mt-[0.5vw]">
                                        <span className="text-[#A1A1AA] text-xs">
                                          {summary.updatedAt ? new Date(summary.updatedAt).toLocaleDateString() : ""}
                                        </span>
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs px-2 py-1 mx-1 rounded-full bg-green-100 text-green-700">Summary</span>
                                          {doc && doc.type && (
                                            <span className="text-xs px-2 py-1 mx-1 rounded-full bg-[#ECE9E2] text-[#4B2A06]">{doc.type}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                // Render report
                                if (item.itemType === 'report') {
                                  const report = item;
                                  const drhpDoc = documents.find((d: any) => d.namespace === report.drhpNamespace || d.id === report.drhpId);
                                  const rhpDoc = documents.find((d: any) => d.rhpNamespace === report.rhpNamespace || d.id === report.rhpId);
                                  return (
                                    <div
                                      key={`report-${report.id}`}
                                      className="flex flex-col items-start bg-[#F3F4F6] rounded-xl p-[1vw] min-w-[180px] min-h-[110px] w-full cursor-pointer hover:bg-[#ECECEC] transition relative border-l-4 border-l-blue-500"
                                      onClick={() => {
                                        setSelectedReportId(report.id);
                                        setShowReportModal(true);
                                      }}
                                    >
                                      <div className="flex w-full justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                          <BarChart3 className="h-3 w-3 text-blue-600 mb-[1vw]" />
                                        </div>
                                        <div className="flex" onClick={(e) => e.stopPropagation()}>
                                          <button
                                            className="text-muted-foreground hover:text-[#4B2A06] p-[0.3vw]"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRenameReportClick(report);
                                            }}
                                            title="Rename report"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </button>
                                          <button
                                            className="text-muted-foreground hover:text-red-600 p-[0.3vw]"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteReport(report);
                                            }}
                                            title="Delete report"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                      {renamingReportId === report.id ? (
                                        <input
                                          type="text"
                                          value={renameReportValue}
                                          onChange={(e) => setRenameReportValue(e.target.value)}
                                          onBlur={() => handleRenameReportSubmit(report)}
                                          onKeyDown={(e) => handleRenameReportKeyDown(e, report)}
                                          onClick={(e) => e.stopPropagation()}
                                          className="w-full px-2 py-1 text-sm font-semibold border border-[#4B2A06] rounded mb-1"
                                          autoFocus
                                        />
                                      ) : (
                                        <span className="font-semibold text-[#232323] mb-1 max-w-full truncate block" style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                          {report.title || 'Untitled Report'}
                                        </span>
                                      )}
                                      <div className="text-xs text-gray-500 truncate block mb-1">
                                        {drhpDoc?.name || 'DRHP'} {drhpDoc && rhpDoc ? 'vs' : ''} {rhpDoc?.name || 'RHP'}
                                      </div>
                                      <div className="flex items-center justify-between w-full mt-[0.5vw]">
                                        <span className="text-[#A1A1AA] text-xs">
                                          {report.updatedAt ? new Date(report.updatedAt).toLocaleDateString() : ""}
                                        </span>
                                        <div className="flex justify-between items-center gap-1">
                                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">Report</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                return null;
                              });
                            })()}
                          </div>
                        ) : (
                          // List View for Documents
                          <div className="bg-white overflow-hidden">
                            {/* 
                          Sticky Table Header for Documents
                          Shows column headers: Name, Doc type, Last modified, Actions
                        */}
                            <div className="bg-gray-50 border-b border-gray-200 rounded-lg px-6 py-3">
                              <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-600 ">
                                <div className="col-span-7">Name</div>
                                <div className="col-span-2">Doc type</div>
                                <div className="col-span-2">Last modified</div>
                                <div className="col-span-1 text-right">Actions</div>
                              </div>
                            </div>

                            {/* List Items - Combine documents, summaries, and reports */}
                            {(() => {
                              const allItems: any[] = [
                                ...(filteredDocs || []).map((doc: any) => ({ ...doc, itemType: 'document' })),
                                ...(currentDirectorySummaries || []).map((summary: any) => ({ ...summary, itemType: 'summary' })),
                                ...(currentDirectoryReports || []).map((report: any) => ({ ...report, itemType: 'report' }))
                              ];

                              allItems.sort((a: any, b: any) => {
                                const dateA = new Date(a.updatedAt || a.uploadedAt || 0).getTime();
                                const dateB = new Date(b.updatedAt || b.uploadedAt || 0).getTime();
                                return dateB - dateA;
                              });

                              if (allItems.length === 0) {
                                return (
                                  <div className="text-center text-muted-foreground py-8">
                                    No items found.
                                  </div>
                                );
                              }

                              return allItems.map((item) => {
                                // Render document
                                if (item.itemType === 'document') {
                                  const doc = item;
                                  return (
                                    <div
                                      key={doc.id}
                                      ref={(el) => (docRefs.current[doc.id] = el)}
                                      className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 cursor-pointer transition-colors relative
                                    ${selectedDoc && selectedDoc.id === doc.id
                                          ? "bg-blue-50 border-blue-200"
                                          : ""
                                        }
                                    ${highlightedDocId === doc.id
                                          ? "bg-yellow-100 border-yellow-300 animate-pulse"
                                          : ""
                                        }
                                  `}
                                      onClick={() => {
                                        if (currentFolder) {
                                          localStorage.setItem("currentFolder", JSON.stringify(currentFolder));
                                        }
                                        navigate(`/doc/${doc.id || doc.namespace}`);
                                      }}
                                      onAnimationEnd={() => {
                                        if (highlightedDocId === doc.id)
                                          setHighlightedDocId(null);
                                      }}
                                    >
                                      <div className="col-span-7 flex items-center gap-3">
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
                                                onKeyDown={(e) => handleRenameKeyDown(e, doc)}
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
                                      <div className="col-span-2 flex items-center">
                                        <div className="flex gap-1">
                                          {(doc.relatedRhpId || doc.relatedDrhpId) && (
                                            <span
                                              className="text-sm p-1.5 rounded-full bg-green-800 text-white flex items-center gap-1 cursor-pointer"
                                              title={doc.type === "DRHP" ? "Linked with RHP" : "Linked with DRHP"}
                                            >
                                              <CheckCircle className="h-3 w-3 " />
                                            </span>
                                          )}
                                          <span className="text-xs px-2 py-1 rounded-full bg-[#ECE9E2] text-[#4B2A06]">{doc.type}</span>

                                        </div>
                                      </div>
                                      <div className="col-span-2 flex items-center">
                                        <span className="text-sm text-gray-600">
                                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ""}
                                        </span>
                                      </div>
                                      <div className="col-span-1 flex items-center justify-end">
                                        <div className="flex items-center gap-1">
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
                                            <FolderUpIcon className="h-3 w-3" />
                                          </button>
                                          <button
                                            className="text-[#4B2A06] hover:text-red-600 p-1"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteDoc(doc);
                                            }}
                                            title="Delete document"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                // Render summary
                                if (item.itemType === 'summary') {
                                  const summary = item;
                                  const doc = documents.find((d: any) => d.id === summary.documentId);
                                  return (
                                    <div
                                      key={`summary-${summary.id}`}
                                      className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 cursor-pointer transition-colors relative border-l-4 border-l-green-500"
                                      onClick={() => {
                                        setSelectedSummaryId(summary.id);
                                        setShowSummaryModal(true);
                                      }}
                                    >
                                      <div className="col-span-7 flex items-center gap-3">
                                        <FileText className="h-3 w-3 text-green-600 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <span className="font-medium text-gray-900 truncate">
                                            {summary.title || 'Untitled Summary'}
                                          </span>
                                          {doc && (
                                            <span className="text-xs text-gray-500 truncate block">
                                              {doc.name}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="col-span-2 flex items-center">
                                        <div className="flex gap-1">
                                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Summary</span>
                                          {doc && doc.type && (
                                            <span className="text-xs px-2 py-1 rounded-full bg-[#ECE9E2] text-[#4B2A06]">{doc.type}</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="col-span-2 flex items-center">
                                        <span className="text-sm text-gray-600">
                                          {summary.updatedAt ? new Date(summary.updatedAt).toLocaleDateString() : ""}
                                        </span>
                                      </div>
                                      <div className="col-span-1 flex items-center justify-end">
                                        <div className="flex items-center gap-1">
                                          <button
                                            className="text-[#4B2A06] hover:text-[#4B2A06] p-1"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRenameSummaryClick(summary);
                                            }}
                                            title="Rename summary"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </button>

                                          <button
                                            className="text-[#4B2A06] hover:text-[#4B2A06] p-1"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedSummaryId(summary.id);
                                              setShowSummaryModal(true);
                                            }}
                                            title="View summary"
                                          >
                                            <FileText className="h-3 w-3" />
                                          </button>
                                          <button
                                            className="text-[#4B2A06] hover:text-red-600 p-1"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteSummary(summary);
                                            }}
                                            title="Delete summary"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                // Render report
                                if (item.itemType === 'report') {
                                  const report = item;
                                  const drhpDoc = documents.find((d: any) => d.namespace === report.drhpNamespace || d.id === report.drhpId);
                                  const rhpDoc = documents.find((d: any) => d.rhpNamespace === report.rhpNamespace || d.id === report.rhpId);
                                  return (
                                    <div
                                      key={`report-${report.id}`}
                                      className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 cursor-pointer transition-colors relative border-l-4 border-l-blue-500"
                                      onClick={() => {
                                        setSelectedReportId(report.id);
                                        setShowReportModal(true);
                                      }}
                                    >
                                      <div className="col-span-7 flex items-center gap-3">
                                        <BarChart3 className="h-3 w-3 text-blue-600 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          {renamingReportId === report.id ? (
                                            <input
                                              type="text"
                                              value={renameReportValue}
                                              onChange={(e) => setRenameReportValue(e.target.value)}
                                              onBlur={() => handleRenameReportSubmit(report)}
                                              onKeyDown={(e) => handleRenameReportKeyDown(e, report)}
                                              onClick={(e) => e.stopPropagation()}
                                              className="w-full px-2 py-1 text-sm font-medium border border-[#4B2A06] rounded"
                                              autoFocus
                                            />
                                          ) : (
                                            <span className="font-medium text-gray-900 truncate">
                                              {report.title || 'Untitled Report'}
                                            </span>
                                          )}
                                          <span className="text-xs text-gray-500 truncate block">
                                            {drhpDoc?.name || 'DRHP'} {drhpDoc && rhpDoc ? 'vs' : ''} {rhpDoc?.name || 'RHP'}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="col-span-2 flex items-center">
                                        <div className="flex gap-1">
                                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">Report</span>
                                        </div>
                                      </div>
                                      <div className="col-span-2 flex items-center">
                                        <span className="text-sm text-gray-600">
                                          {report.updatedAt ? new Date(report.updatedAt).toLocaleDateString() : ""}
                                        </span>
                                      </div>
                                      <div className="col-span-1 flex items-center justify-end">
                                        <div className="flex items-center gap-1">
                                          <button
                                            className="text-[#4B2A06] hover:text-[#4B2A06] p-1"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRenameReportClick(report);
                                            }}
                                            title="Rename report"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </button>

                                          <button
                                            className="text-[#4B2A06] hover:text-[#4B2A06] p-1"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedReportId(report.id);
                                              setShowReportModal(true);
                                            }}
                                            title="View report"
                                          >
                                            <img
                                              className="h-3 w-3 object-contain"
                                              src="https://img.icons8.com/pastel-glyph/128/document--v1.png"
                                              alt="view"
                                              style={{ display: 'block', maxWidth: '100%', height: 'auto', minWidth: '12px', minHeight: '12px' }}
                                              onError={(e) => {
                                                console.log('Image failed to load:', e);
                                                e.currentTarget.style.display = 'none';
                                              }}
                                            />
                                          </button>
                                          <button
                                            className="text-[#4B2A06] hover:text-red-600 p-1"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteReport(report);
                                            }}
                                            title="Delete report"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                return null;
                              });
                            })()}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            {/* 
              Delete Document Confirmation Dialog
              Modal that appears when user clicks delete on a document
              Requires confirmation before deletion
            */}
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
                      className="px-[1vw] py-[0.5vw] rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setShowDeleteDialog(false)}
                      disabled={isDeletingDocument}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-[1vw] py-[0.5vw] rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      onClick={confirmDeleteDoc}
                      disabled={isDeletingDocument}
                    >
                      {isDeletingDocument && <Loader2 className="h-4 w-4 animate-spin" />}
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* 
              Upload Success Modal
              Displays after successful document upload
              Shows success message and allows navigation to document
            */}
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
                    onClick={handleCloseExistingModal}
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </main>
          {/* 
            Share Dialog for Documents
            Modal for sharing documents with other users
            Generates shareable links with access control
          */}
          <ShareDialog
            resourceType="document"
            resourceId={shareDocId}
            open={!!shareDocId}
            onOpenChange={(o) => !o && setShareDocId(null)}
          />

          {/* 
            Share Dialog for Directories
            Modal for sharing entire directories with other users
            Provides access to all documents in the directory
          */}
          <ShareDialog
            resourceType="directory"
            resourceId={shareDirectoryId}
            open={!!shareDirectoryId}
            onOpenChange={(o) => !o && setShareDirectoryId(null)}
          />
          {/* 
            Move Document Dialog
            Modal for moving documents between directories
            Shows directory tree for selection
          */}
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
          {/* 
            Move Document to Workspace Dialog
            Modal for moving documents to different workspaces (admin only)
            Allows cross-workspace document management
          */}
          <MoveDocumentToWorkspaceDialog
            open={!!movingDocToWorkspaceId}
            onOpenChange={(o) => {
              if (!o) {
                setMovingDocToWorkspaceId(null);
                setMovingDocToWorkspaceName("");
              }
            }}
            documentId={movingDocToWorkspaceId || ""}
            documentName={movingDocToWorkspaceName}
            onMoveComplete={() => {
              setMovingDocToWorkspaceId(null);
              setMovingDocToWorkspaceName("");
              fetchDocuments();
            }}
          />

          {/* 
            Move Directory to Workspace Dialog
            Modal for moving entire directories to different workspaces (admin only)
            Reuses the document move dialog component
          */}
          {movingDirectoryToWorkspaceId && (
            <MoveDocumentToWorkspaceDialog
              open={!!movingDirectoryToWorkspaceId}
              onOpenChange={(o) => {
                if (!o) {
                  setMovingDirectoryToWorkspaceId(null);
                  setMovingDirectoryToWorkspaceName("");
                }
              }}
              documentId={movingDirectoryToWorkspaceId || ""}
              documentName={movingDirectoryToWorkspaceName}
              onMoveComplete={() => {
                setMovingDirectoryToWorkspaceId(null);
                setMovingDirectoryToWorkspaceName("");
                fetchAllDirectories();
              }}
            />
          )}

          {/* 
            Delete Directory Confirmation Dialog
            Modal that appears when user clicks delete on a directory
            Warns that all documents inside will be deleted
            Requires confirmation before deletion
          */}
          {showDeleteDirectoryDialog && directoryToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
              <div className="bg-white rounded-lg shadow-lg p-[2vw] max-w-sm w-full">
                <h2 className="text-lg font-bold mb-[1vw]">
                  Delete Directory
                </h2>
                <p className="mb-[2vw]">
                  Are you sure you want to delete "{directoryToDelete?.name}"? This will delete all documents inside. This action cannot be undone.
                </p>
                <div className="flex justify-end gap-[1vw]">
                  <button
                    className="px-[1vw] py-[0.5vw] rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setShowDeleteDirectoryDialog(false)}
                    disabled={isDeletingDirectory}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-[1vw] py-[0.5vw] rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    onClick={confirmDeleteDirectory}
                    disabled={isDeletingDirectory}
                  >
                    {isDeletingDirectory && <Loader2 className="h-4 w-4 animate-spin" />}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 
            DRHP Upload Modal
            Modal for uploading DRHP documents
            Provides file selection and upload progress
          */}
          <DrhpUploadModal
            open={showDrhpUploadModal}
            onOpenChange={(open) => {
              if (!isUploading) {
                setShowDrhpUploadModal(open);
              }
            }}
            setIsUploading={setIsUploading}
            onUploadSuccess={(file) => {
              handleUpload(file, "DRHP").finally(() => {
                // Close modal after upload completes (success or error)
                setTimeout(() => {
                  setShowDrhpUploadModal(false);
                }, 500);
              });
            }}
          />

          {/* 
            RHP Upload Modal
            Modal for uploading RHP documents
            Used when user needs to upload RHP for comparison
          */}
          {showRhpUploadModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload RHP Document</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Select a Red Herring Prospectus (RHP) document. The file MUST be a valid RHP (first page containing "Red Herring Prospectus" and not "Draft").
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
                        const file = e.target.files[0];
                        if (file.type !== "application/pdf") {
                          toast.error("Please select a PDF file");
                          e.target.value = "";
                          return;
                        }
                        setRhpFile(file);
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

          {/* 
            Compare Document Modal
            Modal for selecting documents to compare
            Used when documents are in different directories or no match found
            Shows list of available documents for comparison
          */}
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

          {/* 
            View Summary Modal
            Modal for viewing full summary content
          */}
          <ViewSummaryModal
            summaryId={selectedSummaryId}
            open={showSummaryModal}
            onOpenChange={(open) => {
              setShowSummaryModal(open);
              if (!open) setSelectedSummaryId(null);
            }}
            title={currentDirectorySummaries.find((s: any) => s.id === selectedSummaryId)?.title || "Summary"}
          />

          {/* 
            View Report Modal
            Modal for viewing full report content
          */}
          <ViewReportModal
            reportId={selectedReportId}
            open={showReportModal}
            onOpenChange={(open) => {
              setShowReportModal(open);
              if (!open) setSelectedReportId(null);
            }}
            title={currentDirectoryReports.find((r: any) => r.id === selectedReportId)?.title || "Comparison Report"}
          />

          {/* 
            Directory Selector Modal
            Modal for selecting or creating a directory before upload
            Required for directory-first upload approach
            - Shows existing directories with search
            - Allows creating new directories
            - Pre-fills directory name from filename when possible
          */}
          <DirectorySelector
            open={showDirectorySelector}
            onClose={() => {
              setShowDirectorySelector(false);
              setPendingUpload(null);
            }}
            onSelect={(directoryId) => {
              // Open the selected directory
              directoryService.getById(directoryId).then((dir) => {
                if (dir) {
                  setCurrentFolder({ id: dir.id, name: dir.name });
                  // Track directory open
                  const workspaceId = getCurrentWorkspace();
                  trackDirectoryOpen(dir.id, dir.name, workspaceId);
                  // Dispatch event to refresh recent directories in sidebar
                  window.dispatchEvent(new CustomEvent("directoryOpened"));
                  // Refresh documents for this directory
                  fetchDocuments();
                }
              }).catch((err) => {
                console.error("Error fetching directory:", err);
              });
              setSelectedDirectoryId(directoryId);
              setShowDirectorySelector(false);

              // If there's a pending upload, proceed with it
              if (pendingUpload) {
                handleUpload(pendingUpload.file, pendingUpload.type);
                setPendingUpload(null);
              }
            }}
            onCreateNew={(directoryId, name) => {
              setSelectedDirectoryId(directoryId);
              setCurrentFolder({ id: directoryId, name });
              // Track directory open
              const workspaceId = getCurrentWorkspace();
              trackDirectoryOpen(directoryId, name, workspaceId);
              // Dispatch event to refresh recent directories in sidebar
              window.dispatchEvent(new CustomEvent("directoryOpened"));
              // Refresh documents for this directory
              fetchDocuments();
              setShowDirectorySelector(false);

              // If there's a pending upload, proceed with it
              if (pendingUpload) {
                handleUpload(pendingUpload.file, pendingUpload.type);
                setPendingUpload(null);
              }
            }}
            required={true}
          />
        </div>
      </div>
    </div>
  );
};
