import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { documentService, reportService, Report } from "../services/api";
import { reportN8nService } from "../lib/api/reportN8nService";
import { sessionService } from "../lib/api/sessionService";
import { toast } from "sonner";
import { Navbar } from "../components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Trash2,
  Star,
  Loader2,
  AlertCircle,
  CheckCircle,
  Printer,
  Plus,
  Minus,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { io as socketIOClient } from "socket.io-client";

interface ComparePageProps {}

export const ComparePage: React.FC<ComparePageProps> = () => {
  const { drhpId } = useParams<{ drhpId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessionData] = useState(() => sessionService.initializeSession());

  const [drhp, setDrhp] = useState<any>(null);
  const [rhp, setRhp] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [zoom, setZoom] = useState(1); // 1 = 100%
  const reportRef = useRef<HTMLDivElement>(null);

  const lastHandledRef = useRef<{
    jobId: string | null;
    status: string | null;
  }>({
    jobId: null,
    status: null,
  });

  const fetchDocumentsAndReports = async () => {
    if (!drhpId) return;
    try {
      setLoading(true);
      const drhpDoc = await documentService.getById(drhpId);
      setDrhp(drhpDoc);

      if (drhpDoc.relatedRhpId) {
        const rhpDoc = await documentService.getById(drhpDoc.relatedRhpId);
        setRhp(rhpDoc);
      }

      // Fetch existing reports for this DRHP/RHP pair
      const allReports = await reportService.getAll();
      const filteredReports = allReports.filter(
        (r) =>
          r.drhpNamespace === drhpDoc.namespace ||
          r.rhpNamespace === rhp.rhpNamespace
      );
      setReports(filteredReports);
      if (filteredReports.length > 0) {
        setSelectedReport(filteredReports[0]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load document and reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentsAndReports();
  }, [drhpId]);

  useEffect(() => {
    const socket = socketIOClient(
      process.env.NODE_ENV === "production"
        ? "https://smart-rhtp-backend-2.onrender.com"
        : "https://smart-rhtp-backend-2.onrender.com",
      { transports: ["websocket"] }
    );

    socket.on(
      "compare_status",
      (data: {
        jobId: string;
        status: string;
        error?: string;
        reportId?: string;
      }) => {
        const { jobId, status, error } = data;
        const cleanStatus = status?.trim().toLowerCase();

        if (
          lastHandledRef.current.jobId === jobId &&
          lastHandledRef.current.status === cleanStatus
        ) {
          return;
        }
        lastHandledRef.current = { jobId, status: cleanStatus };

        if (cleanStatus === "completed") {
          toast.success("Comparison completed successfully!");
          setComparing(false);
          // Refetch reports to get the new one
          fetchDocumentsAndReports();
        } else if (cleanStatus === "failed") {
          toast.error(`Comparison failed: ${error || "Unknown error"}`);
          setComparing(false);
        } else if (cleanStatus === "processing") {
          setComparing(true);
        } else {
          setComparing(false);
        }
      }
    );

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleCreateReport = async () => {
    if (!drhp || !rhp) {
      toast.error("Both DRHP and RHP documents are required");
      return;
    }
    const prompt = "Compare these documents and provide a detailed analysis";

    try {
      setComparing(true);
      toast.info("Comparison request sent. Please wait...");
      await reportN8nService.createComparison(
        drhp.namespace,
        rhp.rhpNamespace,
        prompt,
        sessionData,
        drhp.id,
        rhp.id
      );
    } catch (error) {
      console.error("Error creating comparison report:", error);
      toast.error("Failed to initiate comparison report");
      setComparing(false);
    }
  };

  const handleDeleteRhp = async () => {
    if (!drhp) return; // RHP is part of DRHP now

    try {
      setDeleting(true);
      // We delete the DRHP itself, and the backend handles the linked RHP file
      await documentService.delete(drhp.id);
      toast.success("DRHP and linked RHP document deleted successfully");
      navigate("/dashboard"); // Navigate away since the doc is gone
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    } finally {
      setDeleting(false);
    }
  };
  function stripStyleTags(html: string): string {
    return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  }

  const handleDownloadPdf = async () => {
    if (!selectedReport) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/reports/${
          selectedReport.id
        }/download-pdf`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      if (
        !response.ok ||
        response.headers.get("Content-Type") !== "application/pdf"
      ) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to download PDF");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedReport.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    }
  };

  const handleDownloadDocx = async () => {
    if (!selectedReport) return;
    try {
      const blob = await reportService.downloadDocx(selectedReport.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedReport.title}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("DOCX downloaded successfully");
    } catch (error) {
      console.error("Error downloading DOCX:", error);
      toast.error("Failed to download DOCX");
    }
  };

  const handleZoomIn = () =>
    setZoom((z) => Math.min(Math.round((z + 0.1) * 10) / 10, 2));
  const handleZoomOut = () =>
    setZoom((z) => Math.max(Math.round((z - 0.1) * 10) / 10, 1));

  const handlePrint = () => {
    if (reportRef.current) {
      const printWindow = window.open("", "", "width=900,height=650");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Report</title>
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
              </style>
            </head>
            <body>
              ${reportRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar title="Compare Documents" />
        <div className="flex items-center justify-center h-[90vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!drhp) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar title="Compare Documents" />
        <div className="flex items-center justify-center h-[90vh]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Document Not Found</h2>
            <p className="text-gray-600 mb-4">
              The DRHP document could not be found.
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-[100vw]  flex flex-col">
      <Navbar title="Compare Documents" />
      <div className="flex flex-1">
        {/* Left: Document Cards and Compare Button */}
        <div className="w-[50%]  flex  flex-col items-center px-6 py-8 gap-6  bg-gray-50 border-r border-gray-200">
          <div className="w-full flex  flex-row space-x-4 items-center ">
            {/* DRHP Card */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  DRHP Document
                  {drhp.hasRhp && <Star className="h-5 w-5 text-yellow-500" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p>
                    <strong>Name:</strong> {drhp.name}
                  </p>
                  <p>
                    <strong>Namespace:</strong> {drhp.namespace}
                  </p>
                  <p>
                    <strong>Uploaded:</strong>{" "}
                    {new Date(drhp.uploadedAt).toLocaleDateString()}
                  </p>
                  <Badge variant="secondary">DRHP</Badge>
                </div>
              </CardContent>
            </Card>
            {/* RHP Card */}
            <Card className="w-full relative">
              {/* Delete button at top right */}
              {rhp && (
                <div className="absolute top-3 right-3 z-10">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="p-2"
                        disabled={deleting}
                        title="Delete Document"
                      >
                        {deleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Document</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this document and its
                          linked RHP? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteRhp}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  RHP Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rhp ? (
                  <div className="space-y-2">
                    <p>
                      <strong>Name:</strong> {rhp.name}
                    </p>
                    <p>
                      <strong>Namespace:</strong> {rhp.rhpNamespace}
                    </p>
                    <p>
                      <strong>Uploaded:</strong>{" "}
                      {new Date(rhp.uploadedAt).toLocaleDateString()}
                    </p>
                    <Badge variant="secondary">RHP</Badge>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No RHP document found</p>
                    <p className="text-sm text-gray-500">
                      Upload an RHP document to enable comparison
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {/* Compare Button */}
          {rhp && (
            <Button
              onClick={handleCreateReport}
              disabled={comparing}
              className="mt-4 w-48 bg-[#4B2A06] hover:bg-[#4B2A06] text-white font-semibold text-lg"
            >
              {comparing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Compare <span className="ml-2">⇄</span>
                </>
              )}
            </Button>
          )}
        </div>
        {/* Vertical Divider */}
        {/* Right: Summary/Report */}
        <div className="w-[50vw] flex-2 flex flex-col px-8 py-8 bg-gray-50">
          {/* Header row with controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-lg">Comparision Report</div>
            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <button
                className="p-2 rounded hover:bg-gray-100"
                onClick={handleZoomOut}
                title="Zoom Out"
                disabled={zoom <= 1}
              >
                <Minus className="h-5 w-5" />
              </button>
              <span className="w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                className="p-2 rounded hover:bg-gray-100"
                onClick={handleZoomIn}
                title="Zoom In"
                disabled={zoom >= 2}
              >
                <Plus className="h-5 w-5" />
              </button>
              {/* Download DOCX */}
              <button
                className="p-2 rounded hover:bg-gray-100"
                onClick={handleDownloadDocx}
                title="Download DOCX"
              >
                <FileText className="h-5 w-5" />
              </button>
              {/* Download PDF */}
              <button
                className="p-2 rounded hover:bg-gray-100"
                onClick={handleDownloadPdf}
                title="Download PDF"
              >
                <Download className="h-5 w-5" />
              </button>
              {/* Print */}
              <button
                className="p-2 rounded hover:bg-gray-100"
                onClick={handlePrint}
                title="Print"
              >
                <Printer className="h-5 w-5" />
              </button>
            </div>
          </div>
          {comparing ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-[#4B2A06]" />
              <span className="ml-4 text-lg">Loading Summary......</span>
            </div>
          ) : selectedReport ? (
            <div className="flex-1">
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
              <div className="h-[75vh] hide-scrollbar border-2 border-gray-200 rounded-md overflow-auto">
                <div
                  ref={reportRef}
                  className="summary-content text-foreground/90 leading-relaxed py-8 px-5"
                  style={{
                    width: "100%",
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    transform: `scale(${zoom})`,
                    transformOrigin: "top left",
                  }}
                  dangerouslySetInnerHTML={{
                    __html: stripStyleTags(selectedReport.content),
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              No summary available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComparePage;
