import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Download, Copy, CheckCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { n8nService } from "@/lib/api/n8nService";
import { sessionService } from "@/lib/api/sessionService";
import { summaryService } from "@/services/api";
import { Tooltip } from "@/components/ui/tooltip";
import {
  summaryStorageService,
  Summary,
} from "@/lib/api/summaryStorageService";

interface SummaryMetadata {
  pageCount?: Number;
  url?: String;
  pdfExpiry?: String;
  duration?: Number;
  name?: String;
}

interface Summary {
  id: string;
  content: string;
  metadata?: SummaryMetadata;
  updatedAt?: string;
}

interface SummaryPanelProps {
  isDocumentProcessed: boolean;
  currentDocument: {
    id: string;
    name: string;
    uploadedAt: string;
    namespace?: string;
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
function stripStyleTags(html: string): string {
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
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
  const [error, setError] = useState<string | null>(null);
  const [copiedSummaryId, setCopiedSummaryId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    onProcessingChange(isSummarizing);
  }, [isSummarizing, onProcessingChange]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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
    if (selectedSummaryId && allSummaries.length > 0) {
      const selectedSummary = allSummaries.find(
        (s) => s.id === selectedSummaryId
      );
      if (selectedSummary) {
        setSummary(selectedSummary.content);
        setSummaryGenerated(true);
        if (selectedSummary.metadata?.url) {
          setPdfUrl(String(selectedSummary.metadata.url));
          setPdfUrlExpiry(String(selectedSummary.metadata.pdfExpiry));
        }
        return;
      }
    }
    setSummary("");
    setSummaryGenerated(false);
    setPdfUrl(null);
    setPdfUrlExpiry(null);
  }, [selectedSummaryId, allSummaries, onSummarySelect]);

  const handleNewSummary = async () => {
    if (!currentDocument?.id) return;

    setIsSummarizing(true);
    setError(null);
    onSummarySelect(null);

    // Abort previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await n8nService.sendMessage(
        "Generate RHP Doc Summary",
        sessionData,
        [],
        currentDocument.namespace,
        abortControllerRef.current.signal
      );

      // Handle n8n-specific error response
      if (response.error) {
        throw new Error(response.error);
      }

      if (
        response &&
        response.response &&
        Array.isArray(response.response) &&
        response.response.length === 2
      ) {
        const [pdfMetadata, summaryContent] = response.response;
        if (!summaryContent?.output) {
          throw new Error("No summary content found in the response");
        }
        if (!pdfMetadata?.url) {
          throw new Error("No PDF URL found in the response");
        }
        try {
          const newSummary = await summaryService.create({
            title: `Summary for ${currentDocument.name}`,
            content: summaryContent.output,
            documentId: currentDocument.id,
            metadata: {
              pageCount: pdfMetadata.pageCount,
              url: pdfMetadata.url,
              pdfExpiry: pdfMetadata.pdfExpiry,
              duration: pdfMetadata.duration,
              name: pdfMetadata.name,
            },
          });
          setSummary(summaryContent.output);
          setPdfUrl(String(pdfMetadata.url));
          setPdfUrlExpiry(String(pdfMetadata.pdfExpiry));
          setSummaryGenerated(true);
          onSummarySelect(newSummary.id);
          toast.success("SOP Summary generated and saved successfully");
          await summaryStorageService.saveSummary(newSummary);
          setAllSummaries([newSummary, ...allSummaries]);
        } catch (saveError) {
          console.error("Error saving summary:", saveError);
          setSummary(summaryContent.output);
          setPdfUrl(String(pdfMetadata.url));
          setPdfUrlExpiry(String(pdfMetadata.pdfExpiry));
          setSummaryGenerated(true);
          toast.warning(
            "Summary generated but failed to save. Please try saving again."
          );
        }
      } else {
        throw new Error("Invalid summary format received.");
      }
    } catch (err) {
      console.error("Error generating summary:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate summary.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summary);
    setIsCopied(true);
    toast.success("Summary copied to clipboard");
    setTimeout(() => {
      setIsCopied(false);
    }, 3000);
  };

  const handleDownload = async () => {
    if (!pdfUrl) {
      toast.error("PDF download URL is not available");
      console.error("No pdfUrl available for download.");
      return;
    }
    // Check if URL has expired
    if (pdfUrlExpiry && new Date(pdfUrlExpiry) < new Date()) {
      toast.error(
        "PDF download link has expired. Please generate a new summary."
      );
      console.warn("PDF download link expired:", pdfUrlExpiry);
      setPdfUrl(null);
      setPdfUrlExpiry(null);
      return;
    }
    try {
      // Show loading toast
      const loadingToast = toast.loading("Downloading PDF...");
      console.log("Attempting to download PDF from:", pdfUrl);
      // Fetch the PDF file
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Failed to download PDF. Status: ${response.status} ${response.statusText}. Response:`,
          errorText
        );
        toast.dismiss(loadingToast);
        toast.error(
          `Failed to download PDF. Server responded with status ${response.status}.`
        );
        setPdfUrl(null);
        setPdfUrlExpiry(null);
        return;
      }
      // Get the blob from the response
      const blob = await response.blob();
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${currentDocument?.name || "document"}.pdf`;
      // Trigger download
      document.body.appendChild(link);
      link.click();
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      // Show success toast
      toast.dismiss(loadingToast);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error(
        "Failed to download PDF. Please try again or check the console for details."
      );
      setPdfUrl(null);
      setPdfUrlExpiry(null);
    }
  };

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
              disabled={isSummarizing}
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
            <Button
              variant="outline"
              className="bg-white border border-border rounded-sm p-5 w-10 h-10 flex items-center justify-center hover:bg-muted transition-colors text-foreground shadow-none"
              onClick={handleDownload}
              disabled={!pdfUrl}
              style={{ minWidth: 40, minHeight: 40 }}
            >
              <Download className="h-5 w-5 text-[#3F2306]" />
            </Button>
          </div>

          <div
            className="flex-1 bg-muted rounded-lg p-4 overflow-y-auto min-h-0 animate-fade-in relative"
            style={{ height: "100%" }}
          >
            {/* Copy icon at top-right */}
            <button
              className="sticky top-0 left-[90%] z-10 p-2 rounded-sm bg-background shadow hover:bg-muted transition-colors"
              onClick={handleCopySummary}
              title={isCopied ? "Copied!" : "Copy to clipboard"}
            >
              {isCopied ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Copy className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
            {/* Add local table styles for summary content */}
            <style>{`
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
            `}</style>
            {/* HTML Content Display */}
            <div className="overflow-x-auto hide-scrollbar">
              <div
                className="summary-content text-foreground/90 leading-relaxed min-w-fit"
                dangerouslySetInnerHTML={{ __html: stripStyleTags(summary) }}
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
            Click here to generate DRHP Summary
          </p>
          <Button
            onClick={handleNewSummary}
            disabled={isSummarizing}
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
