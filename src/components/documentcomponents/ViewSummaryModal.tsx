import React, { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { summaryService } from "@/services/api";
import { markdownToHtml, isMarkdown, cleanSummaryContent } from "@/lib/utils/markdownConverter";

import { FileText, Printer } from "lucide-react";

import { toast } from "sonner";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface ViewSummaryModalProps {
  summaryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

// Lightweight preview of a saved summary inside a modal with consistent heading/link styles.
export const ViewSummaryModal: React.FC<ViewSummaryModalProps> = ({ summaryId, open, onOpenChange, title }) => {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const stripStyleTags = (s: string) => s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<link[^>]*>/gi, "");
  const linkifyHtml = (s: string) => {
    if (!s) return s;
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const urlRegex = /(?:(https?:\/\/)|\bwww\.)[\w.-]+(?:\.[\w.-]+)+(?:[\w\-._~:/?#\[\]@!$&'()*+,;=%]*)/g;
    let out = s.replace(emailRegex, (m) => `<a href="mailto:${m}">${m}</a>`);
    out = out.replace(urlRegex, (m) => {
      const hasProtocol = m.startsWith("http://") || m.startsWith("https://");
      const href = hasProtocol ? m : `http://${m}`;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${m}</a>`;
    });
    return out;
  };

  useEffect(() => {
    const load = async () => {
      if (!summaryId || !open) return;
      setLoading(true);
      try {
        // summaries from API include HTML in content
        const all = await summaryService.getAll();
        const target = (all || []).find((s: any) => s.id === summaryId);

        if (target) {
          // Clean raw content first (remove \n literals)
          const content = cleanSummaryContent(target.content);
          // Check for markdown and convert if needed
          const processedContent = isMarkdown(content) ? markdownToHtml(content) : content;
          setHtml(linkifyHtml(stripStyleTags(processedContent)));
        } else {

          setHtml("<div style='padding:8px;color:#666'>No content found</div>");
        }

      } catch {
        setHtml("<div style='padding:8px;color:#666'>Failed to load content</div>");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [summaryId, open]);

  const handleDownloadDocx = async () => {
    if (!summaryId) {
      toast.error("No summary selected");
      return;
    }
    let loadingToast;
    try {
      loadingToast = toast.loading("Download processing...");
      const blob = await summaryService.downloadDocx(summaryId);

      // Check if blob is actually an error response
      if (blob.type && blob.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && blob.type !== "application/octet-stream") {
        // Might be an error response, try to parse it
        const text = await blob.text();
        let errorData;
        try {
          errorData = JSON.parse(text);
          throw new Error(errorData.message || errorData.error || "DOCX generation service unavailable");
        } catch (parseError) {
          throw new Error("Invalid DOCX response from server");
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title || "summary"}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.dismiss(loadingToast);
      toast.success("DOCX downloaded successfully");
    } catch (error: any) {
      toast.dismiss(loadingToast);
      const errorMessage = error?.message || "Failed to download DOCX";
      toast.error(errorMessage);
      console.error("DOCX download error:", error);
    }
  };

  const handlePrintSummary = () => {
    if (contentRef.current) {
      const printWindow = window.open("", "", "width=900,height=650");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Summary - ${title || "Summary"}</title>
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                  margin: 0; 
                  padding: 2rem; 
                  line-height: 1.6;
                  color: #1F2937;
                }
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
                .summary-content h1 { font-size: 22px; font-weight: 700; color: #1F2937; margin: 10px 0; }
                .summary-content h2 { font-size: 20px; font-weight: 700; color: #1F2937; margin: 10px 0; }
                .summary-content h3 { font-size: 18px; font-weight: 700; color: #1F2937; margin: 10px 0; }
                .summary-content h4 { font-size: 16px; font-weight: 700; color: #1F2937; margin: 10px 0; }
                .summary-content a { color: #1d4ed8; text-decoration: underline; }
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
                ${contentRef.current.innerHTML}
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-white" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <div className="flex items-center mt-5 justify-between">
            <DialogTitle>{title || "Summary"}</DialogTitle>
            <div className="flex gap-2 items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="bg-white border border-border rounded-sm p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors text-foreground shadow-none"
                    onClick={handleDownloadDocx}
                    title="Download DOCX file"
                    disabled={!summaryId || loading}
                  >
                    <FileText className="h-6 w-6 text-blue-700" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Download DOCX file</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="bg-white border border-border rounded-sm p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors text-foreground shadow-none"
                    onClick={handlePrintSummary}
                    title="Print Summary"
                    disabled={!html || loading}
                  >
                    <Printer className="h-6 w-6 text-gray-700" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Print Summary</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-auto border rounded-md p-3 bg-white">
          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : (
            <div
              ref={contentRef}
              className="summary-content preview-html p-4"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
};


