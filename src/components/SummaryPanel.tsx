import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Download,
  Copy,
  CheckCircle,
  FileText,
  FileDown,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { n8nService } from "@/lib/api/n8nService";
import { sessionService } from "@/lib/api/sessionService";
import { summaryService, Summary, shareService } from "@/services/api";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { summaryN8nService } from "@/lib/api/summaryN8nService";
import { io as socketIOClient } from "socket.io-client";

interface SummaryMetadata {
  pageCount?: Number;
  url?: String;
  pdfExpiry?: String;
  duration?: Number;
  name?: String;
}

interface SummaryPanelProps {
  isDocumentProcessed: boolean;
  currentDocument: {
    id: string;
    name: string;
    uploadedAt: string;
    namespace?: string;
    rhpNamespace?: string; // Add rhpNamespace for RHP documents
    type?: string; // Add type to determine document type
    // Removed: userId: string;
  } | null;
  onProcessingChange?: (isProcessing: boolean) => void;
  selectedSummaryId: string | null;
  onSummarySelect: (summaryId: string | null) => void;
}

interface SummaryResponse {
  pageCount: Number;
  url: String;
  pdfExpiry: String;
  duration: Number;
  name: string;
  output: string;
}

interface N8nResponse {
  response: [SummaryResponse, { output: string }];
  memory_context?: any;
}

// Utility to strip <style> tags from HTML
// Incoming summaries may include embedded styles; we remove them to enforce our own UI styles.
function stripStyleTags(html: string): string {
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
}

// Convert plain URLs and emails in HTML to clickable links
// Ensures text like example.com and user@example.com become actionable anchors.
function linkifyHtml(html: string): string {
  if (!html) return html;
  // Make emails clickable
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  // Make http/https and www URLs clickable
  const urlRegex = /(?:(https?:\/\/)|\bwww\.)[\w.-]+(?:\.[\w.-]+)+(?:[\w\-._~:/?#\[\]@!$&'()*+,;=%]*)/g;

  let out = html.replace(emailRegex, (m) => `<a href="mailto:${m}">${m}</a>`);
  out = out.replace(urlRegex, (m) => {
    const hasProtocol = m.startsWith("http://") || m.startsWith("https://");
    const href = hasProtocol ? m : `http://${m}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${m}</a>`;
  });
  return out;
}

export function SummaryPanel({
  isDocumentProcessed,
  currentDocument,
  onProcessingChange,
  selectedSummaryId,
  onSummarySelect,
}: SummaryPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summaryGenerated, setSummaryGenerated] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [summary, setSummary] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfUrlExpiry, setPdfUrlExpiry] = useState<string | null>(null);
  const [sessionData] = useState(() => sessionService.initializeSession());
  const [allSummaries, setAllSummaries] = useState<Summary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [linkRole, setLinkRole] = useState<"viewer"|"editor"|"owner"|null>(null);
  const [lastSummaryId, setLastSummaryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedSummaryId, setCopiedSummaryId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHandledRef = useRef<{
    jobId: string | null;
    status: string | null;
  }>({ jobId: null, status: null });
  // Add a ref for the summary content
  const summaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    onProcessingChange(isSummarizing);
  }, [isSummarizing, onProcessingChange]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      // No abortControllerRef to clear
    };
  }, []);

  useEffect(() => {
    // Resolve link role if a shared token is active
    (async () => {
      const role = await shareService.resolveTokenRole();
      setLinkRole(role);
    })();
  }, []);

  // console.log(currentDocument);
  // Fetch all summaries for the document and auto-select latest if none selected
  useEffect(() => {
    const fetchSummaries = async () => {
      if (!currentDocument?.id) return;
      try {
        const summaries = await summaryService.getByDocumentId(
          currentDocument.id
        );
        setAllSummaries(summaries);
        // If no summary is selected but summaries exist, auto-select the latest
        if (
          (!selectedSummaryId ||
            !summaries.find((s) => s.id === selectedSummaryId)) &&
          summaries.length > 0
        ) {
          // Sort by updatedAt descending, pick latest
          const sorted = [...summaries].sort(
            (a, b) =>
              new Date(b.updatedAt || 0).getTime() -
              new Date(a.updatedAt || 0).getTime()
          );
          onSummarySelect(sorted[0].id);
        }
      } catch (error) {
        setAllSummaries([]);
      }
    };
    fetchSummaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDocument?.id]);

  // When selectedSummaryId or allSummaries changes, update summary display
  useEffect(() => {
    if (!selectedSummaryId && allSummaries.length > 0) {
      // Already handled by fetchSummaries, but fallback
      const sorted = [...allSummaries].sort(
        (a, b) =>
          new Date(b.updatedAt || 0).getTime() -
          new Date(a.updatedAt || 0).getTime()
      );
      onSummarySelect(sorted[0].id);
      return;
    }
    const selectedSummary = allSummaries.find(
      (s) => s.id === selectedSummaryId
    );
    if (selectedSummary) {
      setSummary(selectedSummary.content);
      setSummaryGenerated(true);
      // Remove metadata access since Summary interface doesn't have metadata property
      setPdfUrl(null);
      setPdfUrlExpiry(null);
      return;
    }
    setSummary("");
    setSummaryGenerated(false);
    setPdfUrl(null);
    setPdfUrlExpiry(null);
  }, [selectedSummaryId, allSummaries, onSummarySelect]);

  useEffect(() => {
    // On mount and on window focus, check if summary is ready
    const checkSummaryReady = async () => {
      if (!currentDocument?.id) return;
      const key = `summary_processing_${currentDocument.id}`;
      const jobStartedAt = Number(localStorage.getItem(key));

      if (jobStartedAt) {
        // Fetch summaries
        const summaries = await summaryService.getByDocumentId(
          currentDocument.id
        );
        if (summaries && summaries.length > 0) {
          // Check if any summary was created after the job started
          const newSummary = summaries.find(
            (summary) => new Date(summary.updatedAt).getTime() > jobStartedAt
          );

          if (newSummary) {
            setAllSummaries(summaries);
            setIsSummarizing(false);
            localStorage.removeItem(key);
            // Set ready flag for global notification
            localStorage.setItem(`summary_ready_${currentDocument.id}`, "1");
            toast.success("Summary is ready!");
            // Auto-select the new summary
            onSummarySelect(newSummary.id);
          }
        }
      }
    };
    checkSummaryReady();
    // Listen for window focus
    const onFocus = () => checkSummaryReady();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [currentDocument?.id, onSummarySelect]);

  useEffect(() => {
    // On mount, check if summary processing is ongoing for this document
    if (!currentDocument?.id) return;
    const key = `summary_processing_${currentDocument.id}`;
    const jobStartedAt = Number(localStorage.getItem(key));
    if (jobStartedAt) {
      setIsSummarizing(true);
    }
  }, [currentDocument?.id]);

  // When summaries are fetched and the latest is rendered, clear the processing flag only if a new summary is present
  useEffect(() => {
    if (!currentDocument?.id) return;
    const key = `summary_processing_${currentDocument.id}`;
    const jobStartedAt = Number(localStorage.getItem(key));
    if (
      isSummarizing &&
      allSummaries &&
      allSummaries.length > 0 &&
      jobStartedAt
    ) {
      // Find the latest summary
      const latestSummary = allSummaries.reduce((a, b) =>
        new Date(a.updatedAt).getTime() > new Date(b.updatedAt).getTime()
          ? a
          : b
      );
      if (new Date(latestSummary.updatedAt).getTime() > jobStartedAt) {
        localStorage.removeItem(key);
        setIsSummarizing(false);
      }
    }
  }, [allSummaries, isSummarizing, currentDocument?.id]);

  useEffect(() => {
    // Connect to backend Socket.IO server
    const socket = socketIOClient(
      process.env.NODE_ENV === "production"
        ? "https://smart-rhtp-backend-2.onrender.com"
        : "https://smart-rhtp-backend-2.onrender.com",
      { transports: ["websocket"] }
    );
    console.log("conection", socket);
    socket.on("summary_status", (data) => {
      const { jobId, status, error } = data;
      const cleanStatus = status?.trim().toLowerCase();
      // Deduplicate: only handle if this jobId+status is new
      if (
        lastHandledRef.current.jobId === jobId &&
        lastHandledRef.current.status === cleanStatus
      ) {
        return; // Already handled, skip
      }
      lastHandledRef.current = { jobId, status: cleanStatus };
      console.log("Socket event received:", data);

      // Clear timeout on any status event
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (cleanStatus === "success") {
        // Refetch summaries for the current document
        if (currentDocument?.id) {
          summaryService
            .getByDocumentId(currentDocument.id)
            .then((summaries) => {
              setAllSummaries(summaries);
              toast.success("Summary generated!");
              setIsSummarizing(false);
              setLastSummaryId(summaries[0]?.id || null);
              if (summaries.length > 0) {
                onSummarySelect(summaries[0].id);
              }
            });
        }
        // Remove processing state
        if (currentDocument?.id)
          localStorage.removeItem(`summary_processing_${currentDocument.id}`);
      } else if (cleanStatus === "failed") {
        setIsSummarizing(false);
        setLastSummaryId(null);
        if (currentDocument?.id)
          localStorage.removeItem(`summary_processing_${currentDocument.id}`);
        let errorMsg = "Unknown error";
        if (typeof error === "string") errorMsg = error;
        else if (error?.message) errorMsg = error.message;
        else if (error?.stack) errorMsg = error.stack;
        toast.error(`Summary failed: ${errorMsg}`);
      } else if (cleanStatus === "processing") {
        setIsSummarizing(true);
        if (currentDocument?.id)
          localStorage.setItem(`summary_processing_${currentDocument.id}`, "1");
      } else {
        // For any other status, stop processing
        setIsSummarizing(false);
        if (currentDocument?.id)
          localStorage.removeItem(`summary_processing_${currentDocument.id}`);
      }
    });
    return () => {
      socket.disconnect();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentDocument?.id, onSummarySelect]);

  // Start the timeout when a new summary is requested
  const handleNewSummary = async () => {
    if (!currentDocument?.id) return;
    // Find the previous summary for this document
    const previousSummary = allSummaries[0]; // assuming sorted by updatedAt desc
    try {
      if (previousSummary) {
        await summaryService.delete(previousSummary.id);
      }
      // Clear current summary and selection
      setSummary("");
      setSummaryGenerated(false);
      onSummarySelect(null);
      setIsSummarizing(true);
      const jobStartedAt = Date.now();
      localStorage.setItem(
        `summary_processing_${currentDocument.id}`,
        jobStartedAt.toString()
      );
      toast.info("Summary request processing...");
      // Start 10-minute timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsSummarizing(false);
        toast.error(
          "Summary generation timed out after 10 minutes. Please try again."
        );
      }, 10 * 60 * 1000); // 10 minutes
      await summaryN8nService.createSummary(
        currentDocument.type === "RHP"
          ? "Generate RHP Doc Summary"
          : "Generate DRHP Doc Summary",
        sessionData,
        undefined, // conversationHistory
        currentDocument.namespace,
        currentDocument.id,
        undefined, // signal
        currentDocument.type, // Pass type for dynamic webhook
        currentDocument.rhpNamespace // Pass rhpNamespace for RHP documents
      );
    } catch (error) {
      toast.error("Failed to create new summary");
      setIsSummarizing(false);
      localStorage.removeItem(`summary_processing_${currentDocument.id}`);
    }
  };

  const handleCopySummary = () => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = stripStyleTags(summary || "");
    const plainText = tempDiv.textContent || (tempDiv as any).innerText || "";
    navigator.clipboard.writeText(plainText);
    setIsCopied(true);
    toast.success("Summary copied to clipboard");
    setTimeout(() => {
      setIsCopied(false);
    }, 3000);
  };

  const handleDownloadDocx = async () => {
    if (!selectedSummaryId) {
      toast.error("No summary selected");
      return;
    }
    let loadingToast;
    try {
      loadingToast = toast.loading("Download processing...");
      const blob = await summaryService.downloadDocx(selectedSummaryId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${currentDocument?.name || "summary"}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.dismiss(loadingToast);
      toast.success("DOCX downloaded successfully");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Failed to download DOCX");
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedSummaryId) {
      toast.error("No summary selected");
      return;
    }
    let loadingToast;
    try {
      loadingToast = toast.loading("Download processing...");
      const blob = await summaryService.downloadHtmlPdf(selectedSummaryId);
      if (blob.type !== "application/pdf" || blob.size < 100) {
        throw new Error("Failed to generate PDF. Please try again later.");
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${currentDocument?.name || "summary"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.dismiss(loadingToast);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Failed to download PDF");
    }
  };

  // Find the selected summary object
  const selectedSummaryObj = allSummaries.find(
    (s) => s.id === selectedSummaryId
  );
  const hasPdf = !!(
    selectedSummaryObj && (selectedSummaryObj as any).pdfFileKey
  );

  // Print handler for summary
  const handlePrintSummary = () => {
    if (summaryRef.current) {
      const printWindow = window.open("", "", "width=900,height=650");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Summary</title>
              <style>
                body { font-family: sans-serif; margin: 0; padding: 2rem; }
                .summary-content table {
                  border-collapse: collapse;
                  width: 100%;
                  border: 2px solid #d1d5de;
                  margin: 16px 0;
                  font-size: 13px;
                  background: #f1eada;
                }
                .summary-content th, .summary-content td {
                  border: 1px solid #d1d5de;
                  padding: 6px 8px;
                  text-align: left;
                }
                .summary-content th {
                  background: #f1eada;
                  font-weight: 600;
                }
                .summary-content tr:nth-child(even) td {
                  background: #f1eada;
                }
                @media print {
                  .summary-content table {
                    border-collapse: collapse !important;
                    width: 100% !important;
                    border: 2px solid #d1d5de !important;
                    background: #f1eada !important;
                  }
                  .summary-content th, .summary-content td {
                    border: 1px solid #d1d5de !important;
                    padding: 6px 8px !important;
                    text-align: left !important;
                    background: #f1eada !important;
                    color: #222 !important;
                  }
                  .summary-content th {
                    background: #f1eada !important;
                    font-weight: 600 !important;
                  }
                  .summary-content tr:nth-child(even) td {
                    background: #f1eada !important;
                  }
                }
              </style>
            </head>
            <body>
              <div class="summary-content">
                ${summaryRef.current.innerHTML}
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }
  };

  useEffect(() => {
    // Polling for new summaries if processing is ongoing
    if (!currentDocument?.id) return;
    let interval: NodeJS.Timeout | null = null;
    if (isSummarizing) {
      interval = setInterval(async () => {
        const summaries = await summaryService.getByDocumentId(
          currentDocument.id
        );
        setAllSummaries(summaries);
      }, 5000); // Poll every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSummarizing, currentDocument?.id]);

  useEffect(() => {
    // Refetch summaries on window focus if processing is ongoing
    if (!currentDocument?.id) return;
    const onFocus = async () => {
      if (isSummarizing) {
        const summaries = await summaryService.getByDocumentId(
          currentDocument.id
        );
        setAllSummaries(summaries);
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isSummarizing, currentDocument?.id]);

  if (!isDocumentProcessed) {
    return null;
  }
  // --- NEW LAYOUT ---
  return (
    <div className="flex flex-col h-full w-full">
      {/* If summary exists, show buttons at top and summary below */}
      {summaryGenerated ? (
        <>
          <div className="flex gap-2 mb-4 items-center justify-between">
            <Button
              onClick={handleNewSummary}
              disabled={isSummarizing || (linkRole === 'viewer')}
              className="bg-[#4B2A06] text-white font-semibold  p-6 rounded-md shadow-lg text-xl hover:bg-[#3A2004] focus:outline-none transition-colors"
            >
              {isSummarizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                  Processing...
                </>
              ) : (
                "New Summary"
              )}
            </Button>

            {/* Download PDF and Print buttons side by side */}
            <div className="flex gap-2 items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="bg-white border border-border rounded-sm p-2 w-10 h-10 flex items-center justify-center hover:bg-muted transition-colors text-foreground shadow-none"
                    onClick={handleDownloadPdf}
                    title="Download PDF file"
                  >
                    <FileDown className="h-6 w-6 text-[#3F2306]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Download PDF file</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="bg-white border border-border rounded-sm p-2 w-10 h-10 flex items-center justify-center hover:bg-muted transition-colors text-foreground shadow-none"
                    onClick={handlePrintSummary}
                    title="Print Summary"
                  >
                    <Printer className="h-6 w-6 text-gray-700" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Print Summary</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div
            className="flex-1 bg-[#ECE9E2] rounded-lg p-4 overflow-y-auto min-h-0 animate-fade-in relative"
            style={{ height: "100%" }}
          >
            {/* Copy and download icons at top-right */}
            <div className="sticky top-0 left-[90%] z-10 flex gap-2 justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-2 rounded-sm bg-background shadow hover:bg-muted transition-colors"
                    onClick={handleCopySummary}
                    title={isCopied ? "Copied!" : "Copy to clipboard"}
                  >
                    {isCopied ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Copy className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {isCopied ? "Copied!" : "Copy to clipboard"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-2 rounded-sm bg-background shadow hover:bg-muted transition-colors"
                    onClick={handleDownloadDocx}
                    title="Download DOCX file"
                  >
                    <FileText className="h-5 w-5 text-blue-700" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Download DOCX file</TooltipContent>
              </Tooltip>
            </div>
            {/* Add local table styles for summary contentbg-[#ECE9E2] text-[#4B2A06] */}
            <style>{`
              .summary-content table {
                border-collapse: collapse;
                width: 100%;
                border: 2px solid #d1d5de;
                margin: 16px 0;
                font-size: 13px;
                background: #ECE9E2;
              }
              .summary-content th, .summary-content td {
                border: 1px solid #d1d5de;
                padding: 6px 8px;
                text-align: left;
              }
              .summary-content th {
                background: #ECE9E2;
                font-weight: 600;
              }
              .summary-content tr:nth-child(even) td {
                background: #ECE9E2;
              }
              .summary-content h1 { font-size: 22px; font-weight: 700; color: #1F2937; margin: 10px 0; }
              .summary-content h2 { font-size: 20px; font-weight: 700; color: #1F2937; margin: 10px 0; }
              .summary-content h3 { font-size: 18px; font-weight: 700; color: #1F2937; margin: 10px 0; }
              .summary-content h4 { font-size: 16px; font-weight: 700; color: #1F2937; margin: 10px 0; }
              .summary-content h5 { font-size: 14px; font-weight: 700; color: #1F2937; margin: 10px 0; }
              .summary-content h6 { font-size: 12px; font-weight: 700; color: #1F2937; margin: 10px 0; }
              .summary-content b, .summary-content strong { font-weight: 700; }
              .summary-content hr { border: none; border-top: 1px solid #E5E7EB; margin: 12px 0; }
              .summary-content a { color: #1d4ed8; text-decoration: underline; word-break: break-word; }
            `}</style>
            {/* HTML Content Display */}
            <div className="overflow-x-auto hide-scrollbar ">
              {/* Document Type Badge */}
              {currentDocument?.type && (
                <div className="mb-2 absolute top-5 left-5 right-0 z-100">
                  <Badge variant="default" className="text-xs ">
                    {currentDocument.type}
                  </Badge>
                </div>
              )}
              <div
                ref={summaryRef}
                className="summary-content  text-foreground/90 leading-relaxed"
                style={{
                  width: "100%",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                }}
                dangerouslySetInnerHTML={{ __html: linkifyHtml(stripStyleTags(summary)) }}
              />
            </div>
          </div>
        </>
      ) : (
        // If no summary, show centered create button
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-[#e0d7ce] flex items-center justify-center mb-6 bg-white shadow-sm">
            <FileText className="h-10 w-10 text-[#3f2306]" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-foreground">
            Generate summary
          </h3>
          <p className="text-muted-foreground text-base mb-6">
            Click here to generate{" "}
            {currentDocument?.type === "RHP" ? "RHP" : "DRHP"} Summary
          </p>
          <Button
            onClick={handleNewSummary}
            disabled={isSummarizing || (linkRole === 'viewer')}
            className=" text-[#FF7A1A]  px-6 py-2 font-semibold shadow-none border-none bg-none text-lg flex items-center gap-2"
          >
            {isSummarizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#FF7A1A]" />
                Processing...
              </>
            ) : (
              <>
                <span className="text-xl ">+</span> Generate New Summary
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
