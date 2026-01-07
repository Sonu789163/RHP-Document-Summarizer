import React, { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { reportService } from "@/services/api";
import { FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface ViewReportModalProps {
  reportId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export const ViewReportModal: React.FC<ViewReportModalProps> = ({ reportId, open, onOpenChange, title }) => {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const stripStyleTags = (s: string) => s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<link[^>]*>/gi, "");

  useEffect(() => {
    const load = async () => {
      if (!reportId || !open) return;
      setLoading(true);
      try {
        const all = await reportService.getAll();
        const target = (all || []).find((r: any) => r.id === reportId);
        const content = target?.content || "<div style='padding:8px;color:#666'>No content</div>";
        setHtml(stripStyleTags(content));
      } catch {
        setHtml("<div style='padding:8px;color:#666'>Failed to load content</div>");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reportId, open]);

  const handleDownloadDocx = async () => {
    if (!reportId) {
      toast.error("No report selected");
      return;
    }
    let loadingToast;
    try {
      loadingToast = toast.loading("Download processing...");
      const blob = await reportService.downloadDocx(reportId);
      
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
      link.download = `${title || "report"}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.dismiss(loadingToast);
      toast.success("Report DOCX downloaded successfully");
    } catch (error: any) {
      toast.dismiss(loadingToast);
      const errorMessage = error?.message || "Failed to download DOCX";
      toast.error(errorMessage);
      console.error("DOCX download error:", error);
    }
  };

  const handlePrintReport = () => {
    if (contentRef.current) {
      const printWindow = window.open("", "", "width=900,height=650");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Report - ${title || "Report"}</title>
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                  margin: 0; 
                  padding: 2rem; 
                  line-height: 1.6;
                  color: #1F2937;
                }
                .report-content table {
                  border-collapse: collapse;
                  width: 100%;
                  border: 2px solid #d1d5de;
                  margin: 16px 0;
                  font-size: 13px;
                  background: #f1eada;
                }
                .report-content th, .report-content td {
                  border: 1px solid #d1d5de;
                  padding: 6px 8px;
                  text-align: left;
                }
                .report-content th {
                  background: #f1eada;
                  font-weight: 600;
                }
                .report-content tr:nth-child(even) td {
                  background: #f1eada;
                }
                .report-content h1, .report-content h2, .report-content h3, .report-content h4 { 
                  font-weight: 700; 
                  color: #1F2937; 
                  margin: 10px 0; 
                }
                @media print {
                  .report-content table {
                    border-collapse: collapse !important;
                    width: 100% !important;
                    border: 2px solid #d1d5de !important;
                    background: #f1eada !important;
                  }
                  .report-content th, .report-content td {
                    border: 1px solid #d1d5de !important;
                    padding: 6px 8px !important;
                    text-align: left !important;
                    background: #f1eada !important;
                    color: #222 !important;
                  }
                  .report-content th {
                    background: #f1eada !important;
                    font-weight: 600 !important;
                  }
                  .report-content tr:nth-child(even) td {
                    background: #f1eada !important;
                  }
                }
              </style>
            </head>
            <body>
              <div class="report-content">
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
      <DialogContent className="sm:max-w-4xl bg-white" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <div className="flex items-center mt-5 justify-between">
            <DialogTitle>{title || "Report"}</DialogTitle>
            <div className="flex gap-2 items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="bg-white border border-border rounded-sm p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors text-foreground shadow-none"
                    onClick={handleDownloadDocx}
                    title="Download DOCX file"
                    disabled={!reportId || loading}
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
                    onClick={handlePrintReport}
                    title="Print Report"
                    disabled={!html || loading}
                  >
                    <Printer className="h-6 w-6 text-gray-700" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Print Report</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-auto border rounded-md p-3 bg-white">
          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : (
            <>
              <style>{`
                .preview-html table { border-collapse: collapse; width: 100%; margin: 12px 0; }
                .preview-html th, .preview-html td { border: 1px solid #D1D5DB; padding: 6px 8px; text-align: left; }
                .preview-html th { background: #F3F4F6; font-weight: 600; }
                .preview-html tr:nth-child(even) td { background: #FAFAFA; }
                .preview-html h1, .preview-html h2, .preview-html h3, .preview-html h4 { font-weight: 700; color: #1F2937; margin: 10px 0; }
                .preview-html b, .preview-html strong { font-weight: 700; }
                .preview-html hr { border: none; border-top: 1px solid #E5E7EB; margin: 12px 0; }
              `}</style>
              <div ref={contentRef} className="preview-html" dangerouslySetInnerHTML={{ __html: html }} />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


