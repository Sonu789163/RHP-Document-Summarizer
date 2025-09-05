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
  Menu,
  X,
  BarChart3,
  Sidebar,
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
import { SummaryPanel } from "../components/SummaryPanel";

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
  const [selectedRhpSummaryId, setSelectedRhpSummaryId] = useState<
    string | null
  >(null);
  const [isRhpSummaryProcessing, setIsRhpSummaryProcessing] = useState(false);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
          (rhp && r.rhpNamespace === rhp.rhpNamespace)
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
    // On mount, check if report processing is ongoing for this DRHP
    if (drhpId) {
      const key = `report_processing_${drhpId}`;
      const jobStartedAt = Number(localStorage.getItem(key));
      if (jobStartedAt) {
        setComparing(true);
      }
    }
  }, [drhpId]);

  // When reports are fetched and the latest is rendered, clear the processing flag only if a new report is present
  useEffect(() => {
    if (!drhpId) return;
    const key = `report_processing_${drhpId}`;
    const jobStartedAt = Number(localStorage.getItem(key));
    if (comparing && reports && reports.length > 0 && jobStartedAt) {
      // Find the latest report
      const latestReport = reports.reduce((a, b) =>
        new Date(a.updatedAt).getTime() > new Date(b.updatedAt).getTime()
          ? a
          : b
      );
      if (new Date(latestReport.updatedAt).getTime() > jobStartedAt) {
        localStorage.removeItem(key);
        setComparing(false);
      }
    }
  }, [reports, comparing, drhpId]);

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
          if (drhpId) localStorage.removeItem(`report_processing_${drhpId}`);
          // Refetch reports to get the new one
          fetchDocumentsAndReports();
        } else if (cleanStatus === "failed") {
          toast.error(`Comparison failed: ${error || "Unknown error"}`);
          setComparing(false);
          if (drhpId) localStorage.removeItem(`report_processing_${drhpId}`);
        } else if (cleanStatus === "processing") {
          setComparing(true);
          if (drhpId) {
            const key = `report_processing_${drhpId}`;
            if (!localStorage.getItem(key)) {
              localStorage.setItem(key, Date.now().toString());
            }
          }
        } else {
          setComparing(false);
          if (drhpId) localStorage.removeItem(`report_processing_${drhpId}`);
        }
      }
    );

    return () => {
      socket.disconnect();
    };
  }, [drhpId]);

  useEffect(() => {
    // On mount and on window focus, check if report is ready
    const checkReportReady = async () => {
      if (!drhpId) return;
      const key = `report_processing_${drhpId}`;
      if (localStorage.getItem(key)) {
        // Fetch reports
        const allReports = await reportService.getAll();
        const filteredReports = allReports.filter(
          (r) =>
            r.drhpNamespace === drhp?.namespace ||
            r.rhpNamespace === rhp?.rhpNamespace
        );
        if (filteredReports && filteredReports.length > 0) {
          setReports(filteredReports);
          setComparing(false);
          localStorage.removeItem(key);
          // Set ready flag for global notification
          localStorage.setItem(`report_ready_${drhpId}`, "1");
          toast.success("Comparison report is ready!");
        }
      }
    };
    checkReportReady();
    // Listen for window focus
    const onFocus = () => checkReportReady();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [drhpId, drhp?.namespace, rhp?.rhpNamespace]);

  // Removed periodic polling; rely on socket "completed" event to refresh

  useEffect(() => {
    // Refetch reports on window focus if processing is ongoing
    if (!drhpId) return;
    const onFocus = async () => {
      if (comparing) {
        await fetchDocumentsAndReports();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [comparing, drhpId]);

  const handleCreateReport = async () => {
    if (!drhp || !rhp) {
      toast.error("Both DRHP and RHP documents are required");
      return;
    }
    const prompt = "Compare these documents and provide a detailed analysis";
    // Find the previous report for this DRHP/RHP pair
    const previousReport = reports.find(
      (r) =>
        r.drhpNamespace === drhp.namespace &&
        r.rhpNamespace === rhp.rhpNamespace
    );
    try {
      if (previousReport) {
        await reportService.delete(previousReport.id);
      }
      setComparing(true);
      // Persist processing state with timestamp
      if (drhpId) {
        const jobStartedAt = Date.now();
        localStorage.setItem(
          `report_processing_${drhpId}`,
          jobStartedAt.toString()
        );
      }
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
      if (drhpId) localStorage.removeItem(`report_processing_${drhpId}`);
    }
  };

  const handleDeleteRhp = async () => {
    if (!rhp) return;

    try {
      setDeleting(true);
      // Delete only the RHP document
      await documentService.delete(rhp.id);
      toast.success("RHP document deleted successfully");
      // Refresh the page data to reflect the change
      await fetchDocumentsAndReports();
    } catch (error) {
      console.error("Error deleting RHP document:", error);
      toast.error("Failed to delete RHP document");
    } finally {
      setDeleting(false);
    }
  };

  function stripStyleTags(html: string): string {
    return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  }

  const handleDownloadPdf = async () => {
    if (!selectedReport) return;
    let loadingToast;
    try {
      loadingToast = toast.loading("Downloading PDF...");
      const blob = await reportService.downloadHtmlPdf(selectedReport.id);
      if (blob.type !== "application/pdf" || blob.size < 100) {
        throw new Error("Failed to generate PDF. Please try again later.");
      }
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
    } finally {
      if (loadingToast) toast.dismiss(loadingToast);
    }
  };

  const handleDownloadDocx = async () => {
    if (!selectedReport) return;
    let loadingToast;
    try {
      loadingToast = toast.loading("Download processing...");
      const blob = await reportService.downloadDocx(selectedReport.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedReport.title}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.dismiss(loadingToast);
      toast.success("DOCX downloaded successfully");
    } catch (error) {
      toast.dismiss(loadingToast);
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
                  background: #f1eada;
                  color: #222;
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
                ${reportRef.current.innerHTML}
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
    <div className="h-screen w-[100vw] flex flex-col overflow-x-hidden">
      {/* Top 10vh - Navbar */}
      <div className=" fixed top-0 left-0 right-0 z-50 h-[10vh]">
        <Navbar title="Compare Documents" />
      </div>

      {/* Bottom 90vh - Main Content */}
      <div className="h-[90vh] flex mt-[10vh]">
        {/* Left Sidebar - ChatGPT Style */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            sidebarOpen ? "w-60" : "w-16"
          } fixed top-[10vh] left-0 bg-white border-r border-gray-200 h-[90vh] flex flex-col overflow-hidden`}
        >
          {sidebarOpen && (
            <>
              {/* Sidebar Header */}
              <div className="px-4 py-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#4B2A06]">
                  Documents
                </h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Document Cards */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* DRHP Card */}
                <Card className="w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4" />
                      DRHP Document
                      {drhp.hasRhp && (
                        <Star className="h-4 w-4 text-yellow-500" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1 text-xs">
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
                      <Badge variant="secondary" className="text-xs">
                        DRHP
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* RHP Card */}
                <Card className="w-full relative">
                  {rhp && (
                    <div className="absolute top-2 right-2 z-10">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-gray/50"
                            disabled={deleting}
                            title="Delete Document"
                          >
                            {deleting ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this document and
                              its linked RHP? This action cannot be undone.
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
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4" />
                      RHP Document
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {rhp ? (
                      <div className="space-y-1 text-xs">
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
                        <Badge variant="secondary" className="text-xs">
                          RHP
                        </Badge>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 text-xs">
                          No RHP document found
                        </p>
                        <p className="text-xs text-gray-500">
                          Upload an RHP document to enable comparison
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Compare Button */}
              {rhp && (
                <div className="px-4 py-2 border-t border-gray-200">
                  <Button
                    className="w-full bg-[#4B2A06] hover:bg-[#6b3a0a] text-white font-semibold"
                    onClick={handleCreateReport}
                    disabled={comparing}
                  >
                    {comparing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="mr-1 h-4 w-4" />
                        Compare Documents
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar Toggle Button (when closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-[12vh] left-3 z-50 p-2 bg-white border border-gray-200 rounded-md shadow-md hover:bg-gray-50"
          >
            <Sidebar className="h-5 w-5" />
          </button>
        )}

        {/* Main Content Area */}
        <div
          className={`flex-1 flex h-full flex-col lg:flex-row transition-all duration-300 ease-in-out ${
            sidebarOpen ? "ml-60" : "ml-16"
          }`}
        >
          {/* Middle: Comparison Report */}
          <div className="flex-1 lg:w-[50%] flex flex-col bg-gray-50">
            {/* Report Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 md:p-4 bg-white gap-2 sm:gap-0">
              <div className="font-bold text-md md:text-lg">
                Comparison Report
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Zoom controls */}
                <button
                  className="p-1  rounded hover:bg-gray-100"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  disabled={zoom <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  className="p-1 rounded hover:bg-gray-100"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  disabled={zoom >= 2}
                >
                  <Plus className="h-4 w-4 " />
                </button>
                {/* Download DOCX */}
                <button
                  className="p-1  rounded hover:bg-gray-100"
                  onClick={handleDownloadDocx}
                  title="Download DOCX"
                >
                  <FileText className="h-4 w-4 " />
                </button>
                {/* Download PDF */}
                <button
                  className="p-1  rounded hover:bg-gray-100"
                  onClick={handleDownloadPdf}
                  title="Download PDF"
                >
                  <Download className="h-4 w-4 " />
                </button>
                {/* Print */}
                <button
                  className="p-1 rounded hover:bg-gray-100"
                  onClick={handlePrint}
                  title="Print"
                >
                  <Printer className="h-4 w-4 " />
                </button>
              </div>
            </div>

            {/* Report Content */}
            <div className=" bg-white flex-1 overflow-hidden">
              {comparing ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-[#4B2A06]" />
                  <span className="ml-4 text-lg">Loading Summary......</span>
                </div>
              ) : selectedReport ? (
                <div className="h-full mx-5 my-4 ">
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
                  <div
                    className="h-[95%] hide-scrollbar bg-[#f1eada] rounded-md overflow-y-auto"
                    style={{ zoom: zoom }}
                  >
                    <div
                      ref={reportRef}
                      className="summary-content text-foreground/90 leading-relaxed py-8 px-5"
                      style={{
                        width: "100%",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                      }}
                      dangerouslySetInnerHTML={{
                        __html: stripStyleTags(selectedReport.content),
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 h-full flex items-center justify-center text-gray-400">
                  <div className="text-center ">
                    <BarChart3 className="h-12 w-12 m-auto mb-4 " />
                    <p>No comparison report available</p>
                    <p className="text-sm">
                      Click "Compare Documents" to generate a report
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: RHP Summary Panel */}
          <div className="lg:w-[50%] border-l mt-[-40vh] lg:mt-0 border-gray-200 bg-white flex flex-col">
            <div className="px-2 md:px-4 lg:px-5 pb-2 md:pb-4 lg:pb-4.5 lg:mt-[2vh] flex-1 overflow-hidden">
              {rhp ? (
                <SummaryPanel
                  isDocumentProcessed={true}
                  currentDocument={rhp}
                  onProcessingChange={setIsRhpSummaryProcessing}
                  selectedSummaryId={selectedRhpSummaryId}
                  onSummarySelect={setSelectedRhpSummaryId}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                    <p>No RHP document available</p>
                    <p className="text-sm">
                      Upload an RHP document to view summary
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparePage;
