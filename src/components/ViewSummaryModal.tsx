import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { summaryService } from "@/services/api";

interface ViewSummaryModalProps {
  summaryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export const ViewSummaryModal: React.FC<ViewSummaryModalProps> = ({ summaryId, open, onOpenChange, title }) => {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const stripStyleTags = (s: string) => s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<link[^>]*>/gi, "");

  useEffect(() => {
    const load = async () => {
      if (!summaryId || !open) return;
      setLoading(true);
      try {
        // summaries from API include HTML in content
        const all = await summaryService.getAll();
        const target = (all || []).find((s: any) => s.id === summaryId);
        const content = target?.content || "<div style='padding:8px;color:#666'>No content</div>";
        setHtml(stripStyleTags(content));
      } catch {
        setHtml("<div style='padding:8px;color:#666'>Failed to load content</div>");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [summaryId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-white" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{title || "Summary"}</DialogTitle>
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
                .preview-html h1, .preview-html h2, .preview-html h3, .preview-html h4 {font-size: 24px; font-weight: 700; color: #1F2937; margin: 10px 0; }
                .preview-html b, .preview-html strong { font-weight: 700; }
                .preview-html hr { border: none; border-top: 1px solid #E5E7EB; margin: 12px 0; }
              `}</style>
              <div className="preview-html" dangerouslySetInnerHTML={{ __html: html }} />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


