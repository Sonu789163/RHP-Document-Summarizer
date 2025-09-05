import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  FileText,
  BarChart3,
  FileText as InputIcon,
  Download,
  Trash2,
  MessageSquare,
  Shield,
  Settings,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import {
  documentService,
  chatService,
  summaryService,
  reportService,
} from "../services/api";
import { userService } from "../lib/api/userService";
import { Separator } from "@radix-ui/react-dropdown-menu";

interface Document {
  _id: string;
  name: string;
  createdAt: string;
  createdBy?: string;
  namespace?: string;
  userId?: string;
  microsoftId?: string;
}

interface Summary {
  id: string;
  documentId: string;
  updatedAt: string;
  createdBy?: string;
  title?: string;
  userId?: string;
  microsoftId?: string;
}

interface Report {
  id: string;
  drhpNamespace: string;
  updatedAt: string;
  userId?: string;
  microsoftId?: string;
}

interface Chat {
  _id: string;
  documentId: string;
  messageCount: number;
  createdAt: string;
}

interface ChatStats {
  totalChats: number;
  messagesPerChat: any[];
  chatsPerUser: any[];
}

interface DashboardStats {
  totalUsers: number;
  totalDocuments: number;
  totalReports: number;
  totalSummaries: number;
  totalChats: number;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [summariesLoading, setSummariesLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatStats, setChatStats] = useState<ChatStats | null>(null);
  const [chatsLast30Days, setChatsLast30Days] = useState(0);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reportsFilter, setReportsFilter] = useState("7");
  const [reportsSearch, setReportsSearch] = useState("");

  // Real stats fetched from backend
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDocuments: 0,
    totalReports: 0,
    totalSummaries: 0,
    totalChats: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setDashboardLoading(true);

      // Load user statistics and all users
      const userData = await userService.getUserStats();
      setUserStats(userData);

      // Load all users for name mapping
      const allUsers = await userService.getAllUsers({ limit: 1000 });
      setUsers(allUsers.users);

      // Load documents
      const docs = await documentService.getAll();
      setDocuments(docs);
      setDocumentsLoading(false);

      // Load summaries
      const sums = await summaryService.getAll();
      setSummaries(sums);
      setSummariesLoading(false);

      // Load reports
      const reps = await reportService.getAll();
      setReports(reps);
      setReportsLoading(false);

      // Load chats and chat stats
      const chatData = await chatService.getStats();
      setChatStats(chatData);
      setChatsLast30Days(0); // We'll calculate this
      setChatsLoading(false);

      // Load recent chats for admin
      const allChats = await chatService.getAllAdmin();
      setRecentChats(allChats.slice(0, 3)); // Show only 3 most recent

      // Calculate chats from last 30 days
      if (chatData && chatData.totalChats) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentChats =
          chatData.messagesPerChat?.filter(
            (chat: any) =>
              new Date(chat.createdAt || Date.now()) >= thirtyDaysAgo
          ) || [];
        setChatsLast30Days(recentChats.length);
      }

      // Update stats with real data
      setStats({
        totalUsers: userData?.total || 0,
        totalDocuments: Array.isArray(docs) ? docs.length : 0,
        totalReports: Array.isArray(reps) ? reps.length : 0,
        totalSummaries: Array.isArray(sums) ? sums.length : 0,
        totalChats: chatData?.totalChats || 0,
      });

      setDashboardLoading(false);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setDashboardLoading(false);
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    let loadingToast;
    try {
      loadingToast = toast.loading("Download processing...");
      // For now, just log - implement actual download logic
      console.log("Downloading document:", doc._id);
      toast.dismiss(loadingToast);
      toast.success("Document download initiated");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error downloading document: " + error.message);
      console.error("Error downloading document:", error);
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    try {
      await documentService.delete(doc._id);
      setDocuments(documents.filter((d) => d._id !== doc._id));
      // Update stats
      setStats((prev) => ({
        ...prev,
        totalDocuments: prev.totalDocuments - 1,
      }));
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const handleDownloadSummaryPdf = async (summary: Summary) => {
    let loadingToast;
    try {
      loadingToast = toast.loading("Download processing...");
      await summaryService.downloadHtmlPdf(summary.id);
      toast.dismiss(loadingToast);
      toast.success("Summary PDF downloaded successfully");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error downloading summary PDF: " + error.message);
      console.error("Error downloading summary PDF:", error);
    }
  };

  const handleDeleteSummary = async (summary: Summary) => {
    try {
      await summaryService.delete(summary.id);
      setSummaries(summaries.filter((s) => s.id !== summary.id));
      // Update stats
      setStats((prev) => ({
        ...prev,
        totalSummaries: prev.totalSummaries - 1,
      }));
    } catch (error) {
      console.error("Error deleting summary:", error);
    }
  };

  const handleDownloadReportPdf = async (report: Report) => {
    let loadingToast;
    try {
      loadingToast = toast.loading("Download processing...");
      await reportService.downloadPdf(report.id);
      toast.dismiss(loadingToast);
      toast.success("Report PDF downloaded successfully");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error downloading report PDF: " + error.message);
      console.error("Error downloading report PDF:", error);
    }
  };

  const handleDeleteReport = async (report: Report) => {
    try {
      await reportService.delete(report.id);
      setReports(reports.filter((r) => r.id !== report.id));
      // Update stats
      setStats((prev) => ({ ...prev, totalReports: prev.totalReports - 1 }));
    } catch (error) {
      console.error("Error deleting report:", error);
    }
  };

  const handleDeleteChat = async (chat: any) => {
    try {
      await chatService.deleteAnyAdmin(chat.id || chat._id);
      setRecentChats(
        recentChats.filter((c) => (c.id || c._id) !== (chat.id || chat._id))
      );
      // Update stats
      setStats((prev) => ({
        ...prev,
        totalChats: prev.totalChats - 1,
      }));
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getUserName = (userId?: string, microsoftId?: string) => {
    if (microsoftId) {
      const user = users.find((u) => u.microsoftId === microsoftId);
      return user ? user.name || user.email : `User ${microsoftId.slice(-4)}`;
    }
    if (userId) {
      const user = users.find((u) => u._id === userId);
      return user ? user.name || user.email : `User ${userId.slice(-4)}`;
    }
    return "Unknown User";
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        title="Dashboard"
        showSearch={true}
        searchValue=""
        onSearchChange={() => {}}
      />

      <div className="w-[90vw] mx-auto py-8">
        {/* Top Section - 3 Columns: Key Metrics + Reports Chart + Management Lists */}
        <div className="flex gap-4 mb-4">
          {/* Left Column - Key Metrics */}
          <div className="flex-shrink-0 w-[25vw]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-md font-bold text-[rgba(114, 120, 127, 1)]">
                    Total Users
                  </CardTitle>
                  {/* <User className="h-4 ml-2 w-4 text-[rgba(114, 120, 127, 1)]" /> */}
                </CardHeader>
                <CardContent>
                  <div className="  ml-2 text-2xl font-bold text-[rgba(38,40,43,1)]">
                    {dashboardLoading ? (
                      <div className="animate-pulse bg-white/20 h-8 w-16 rounded"></div>
                    ) : (
                      stats.totalUsers
                    )}
                  </div>
                </CardContent>
              </div>

              <div>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-md font-bold text-[rgba(114, 120, 127, 1)]">
                    Total Documents
                  </CardTitle>
                  {/* <InputIcon className="h-4 ml-2 w-4 text-[rgba(114, 120, 127, 1)]" /> */}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl ml-2 font-bold text-[rgba(38,40,43,1)]">
                    {dashboardLoading ? (
                      <div className="animate-pulse bg-white/20 h-8 w-16 rounded"></div>
                    ) : (
                      stats.totalDocuments
                    )}
                  </div>
                </CardContent>
              </div>

              <div>
                <CardHeader className="flex flex-row items-center space-y-0 mt-10 pb-2">
                  <CardTitle className="text-md font-bold text-[rgba(114, 120, 127, 1)]">
                    Total Summaries
                  </CardTitle>
                  {/* <FileText className="h-4 ml-2 w-4 text-[rgba(114, 120, 127, 1)]" /> */}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl ml-2 font-bold text-[rgba(38,40,43,1)]">
                    {dashboardLoading ? (
                      <div className="animate-pulse bg-white/20 h-8 w-16 rounded"></div>
                    ) : (
                      stats.totalSummaries
                    )}
                  </div>
                </CardContent>
              </div>

              <div>
                <CardHeader className="flex flex-row items-center space-y-0 mt-10 pb-2">
                  <CardTitle className="text-md font-bold text-[rgba(114, 120, 127, 1)]">
                    Total Reports
                  </CardTitle>
                  {/* <BarChart3 className="h-4 ml-2 w-4 text-[rgba(114, 120, 127, 1)]" /> */}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl ml-2 font-bold text-[rgba(38,40,43,1)]">
                    {dashboardLoading ? (
                      <div className="animate-pulse bg-white/20 h-8 w-16 rounded"></div>
                    ) : (
                      stats.totalReports
                    )}
                  </div>
                </CardContent>
              </div>
            </div>
          </div>

          {/* Middle Column - Total Chats Chart */}
          <div className="flex-shrink-0 w-[15vw] min-w-[220px] flex flex-col items-center ">
            <div className="text-lg font-bold text-gray-900 my-5">
              Total Chats
            </div>
            <div className="relative mt-10 w-40 h-40">
              <svg
                className="w-40 h-40 transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <path
                  className="text-gray-300"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="transparent"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[rgba(62,36,7,1)]"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="transparent"
                  strokeDasharray={`${
                    (stats.totalChats / Math.max(stats.totalChats + 10, 1)) *
                    100
                  }, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">
                  {stats.totalChats}
                </span>
              </div>
            </div>
          </div>

          {/* Right Columns - Management Lists */}
          <div className="flex  w-[50vw]">
            {/* Document Management */}

            <div className="flex-shrink-0 w-[25vw]  p-4">
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Document Management
              </h2>
              <div className="text-sm font-medium text-gray-600 mb-3">
                All Documents ({documents.length})
              </div>
              <div className="h-[35vh] overflow-y-auto space-y-2 pr-2 scrollbar-hide ">
                {documentsLoading ? (
                  <div className="text-center py-4 text-gray-600">
                    Loading documents...
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-4 text-gray-600">
                    No documents found
                  </div>
                ) : (
                  documents.map((doc, index) => (
                    <div
                      key={doc._id}
                      className="flex items-center justify-between px-2 py-4 my-1 rounded-lg hover:bg-gray-50 border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-gray-600" />
                        <div>
                          <div className="font-medium  text-gray-900 text-sm ">
                            {doc.name ||
                              doc.namespace ||
                              `Document ${index + 1}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            Created: {formatDate(doc.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="p-1 hover:bg-gray-100 rounded"
                          onClick={() => handleDownloadDocument(doc)}
                          title="Download"
                        >
                          <svg
                            className="h-4 w-4 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                        </button>
                        <button
                          className="p-1 hover:bg-gray-100 rounded"
                          onClick={() => handleDeleteDocument(doc)}
                          title="Delete"
                        >
                          <svg
                            className="h-4 w-4 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* Summary Management */}
            <div className="flex-shrink-0 w-[25vw]  p-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  Summary Management
                </h2>
                <div className="text-sm font-medium text-gray-600 mb-3">
                  All Summaries ({summaries.length})
                </div>
                <div className="h-[35vh] overflow-y-auto  overflow-x-none space-y-2 pr-2 scrollbar-hide">
                  {summariesLoading ? (
                    <div className="text-center py-4 text-gray-600">
                      Loading summaries...
                    </div>
                  ) : summaries.length === 0 ? (
                    <div className="text-center py-4 text-gray-600">
                      No summaries found
                    </div>
                  ) : (
                    summaries.map((summary, index) => (
                      <div
                        key={summary.id}
                        className={`flex items-center justify-between p-2 rounded-lg hover:bg-[rgba(62, 36, 7, 0.13)] border border-gray-200 ${
                          index === 0
                            ? "bg-[rgba(62, 36, 7, 0.13)] border-amber-200"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-gray-600" />
                          <div>
                            <div className="font-medium text-gray-900 text-sm">
                              {summary.title || `Summary ${index + 1}`}
                            </div>
                            <div className="text-xs text-gray-500">
                              Document: {summary.documentId} • Created:{" "}
                              {formatDate(summary.updatedAt)}
                            </div>
                            {index === 0 && (
                              <div className="text-xs text-gray-500 font-medium">
                                Latest Summary
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="p-1 hover:bg-gray-100 rounded"
                            onClick={() => handleDownloadSummaryPdf(summary)}
                            title="Download PDF"
                          >
                            <svg
                              className="h-4 w-4 text-gray-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                              />
                            </svg>
                          </button>
                          <button
                            className="p-1 hover:bg-gray-100 rounded"
                            onClick={() => handleDeleteSummary(summary)}
                            title="Delete"
                          >
                            <svg
                              className="h-4 w-4 text-gray-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Quick View */}
        <div className="border-t border-gray-200 pt-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick View</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              className="bg-[rgba(99,117,135,0.9)] text-white cursor-pointer hover:bg-[rgba(99,117,135,0.9)] transition-colors"
              onClick={() => navigate("/admin/users")}
            >
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">User Management</h3>
                <p className="text-sm text-white/80">
                  Manage User Roles and Permissions
                </p>
              </CardContent>
            </Card>

            {/* Domain Configuration card removed */}

            <Card
              className="bg-[rgba(99,117,135,0.9)] text-white cursor-pointer hover:bg-[rgba(99,117,135,0.9)] transition-colors"
              onClick={() => navigate("/dashboard")}
            >
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">
                  Document Management
                </h3>
                <p className="text-sm text-white/80">Manage Documents</p>
              </CardContent>
            </Card>

            <Card
              className="bg-[rgba(99,117,135,0.9)] text-white cursor-pointer hover:bg-[rgba(99,117,135,0.9)] transition-colors"
              onClick={() => navigate("/chat-history")}
            >
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Chat Management</h3>
                <p className="text-sm text-white/80">Manage chats history</p>
              </CardContent>
            </Card>

            <Card
              className="bg-[rgba(99,117,135,0.9)] text-white cursor-pointer hover:bg-[rgba(99,117,135,0.9)] transition-colors"
              onClick={() => navigate("/profile")}
            >
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">
                  Profile Management
                </h3>
                <p className="text-sm text-white/80">
                  Manage profile and settings
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Chat Management Section */}
        <div className="mt-8 border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Chat Statistics */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Chat Management
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <CardTitle className="text-md font-bold text-[rgba(114, 120, 127, 1)]">
                      Total Chats
                    </CardTitle>
                    <MessageSquare className="h-4 ml-2 w-4 text-[rgba(114, 120, 127, 1)]" />
                  </CardHeader>
                  <CardContent>
                    <div className="ml-2 text-2xl font-bold text-[rgba(38,40,43,1)]">
                      {dashboardLoading ? (
                        <div className="animate-pulse bg-white/20 h-8 w-16 rounded"></div>
                      ) : (
                        stats.totalChats
                      )}
                    </div>
                  </CardContent>
                </div>

                <div className="">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <CardTitle className="text-md font-bold text-[rgba(114, 120, 127, 1)]">
                      Avg Messages
                    </CardTitle>
                    <BarChart3 className="h-4 ml-2 w-4 text-[rgba(114, 120, 127, 1)]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl ml-2 font-bold text-[rgba(38,40,43,1)]">
                      {dashboardLoading ? (
                        <div className="animate-pulse bg-white/20 h-8 w-16 rounded"></div>
                      ) : chatStats?.messagesPerChat?.length ? (
                        Math.round(
                          chatStats.messagesPerChat.reduce(
                            (acc: number, chat: any) => acc + chat.count,
                            0
                          ) / chatStats.messagesPerChat.length
                        )
                      ) : (
                        0
                      )}
                    </div>
                  </CardContent>
                </div>

                <div>
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <CardTitle className="text-md font-bold text-[rgba(114, 120, 127, 1)]">
                      Last 30 days
                    </CardTitle>
                    <FileText className="h-4 ml-2 w-4 text-[rgba(114, 120, 127, 1)]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl ml-2 font-bold text-[rgba(38,40,43,1)]">
                      {dashboardLoading ? (
                        <div className="animate-pulse bg-white/20 h-8 w-16 rounded"></div>
                      ) : (
                        chatsLast30Days
                      )}
                    </div>
                  </CardContent>
                </div>

                <div>
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <CardTitle className="text-md font-bold text-[rgba(114, 120, 127, 1)]">
                      Active users
                    </CardTitle>
                    <User className="h-4 ml-2 w-4 text-[rgba(114, 120, 127, 1)]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl ml-2 font-bold text-[rgba(38,40,43,1)]">
                      {dashboardLoading ? (
                        <div className="animate-pulse bg-white/20 h-8 w-16 rounded"></div>
                      ) : (
                        chatStats?.chatsPerUser?.length || 0
                      )}
                    </div>
                  </CardContent>
                </div>
              </div>
            </div>

            {/* Right Column - Recent Chat Sessions */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Recent Chat Sessions
              </h3>
              <div className="space-y-3">
                {chatsLoading ? (
                  <div className="text-center py-8 text-gray-600">
                    Loading chat sessions...
                  </div>
                ) : recentChats.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    No recent chat sessions found
                  </div>
                ) : (
                  recentChats.map((chat, index) => (
                    <div
                      key={chat.id || chat._id}
                      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {/* User Avatar */}
                        <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center  font-semibold text-sm">
                          {getUserName(chat.userId, chat.microsoftId)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {getUserName(chat.userId, chat.microsoftId)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Document: {chat.documentId}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">
                            Created by:{" "}
                            {getUserName(chat.userId, chat.microsoftId)}
                          </div>
                        </div>
                      </div>
                      <button
                        className="p-2 hover:bg-red-50 rounded-full transition-colors group"
                        onClick={() => handleDeleteChat(chat)}
                        title="Delete Chat"
                      >
                        <Trash2 className="h-4 w-4 text-gray-400 group-hover:text-red-500" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Report Management Section - Full Width */}
        <div className="mt-8 border-t border-gray-200 pt-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Report Management
          </h2>
          <div className="text-sm font-medium text-gray-600 mb-3">
            All Reports ({reports.length})
          </div>
          <div className="h-[35vh] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
            {reportsLoading ? (
              <div className="text-center py-4 text-gray-600">
                Loading reports...
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-4 text-gray-600">
                No reports found
              </div>
            ) : (
              reports.map((report, index) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        Report For Document: {report.drhpNamespace}
                      </div>
                      <div className="text-xs text-gray-500">
                        Document: {report.drhpNamespace}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="p-1 hover:bg-gray-100 rounded"
                      onClick={() => handleDownloadReportPdf(report)}
                      title="Download PDF"
                    >
                      <svg
                        className="h-4 w-4 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </button>
                    <button
                      className="p-1 hover:bg-gray-100 rounded"
                      onClick={() => handleDeleteReport(report)}
                      title="Delete"
                    >
                      <svg
                        className="h-4 w-4 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Information Section */}
        <div className="mt-8 border-t border-gray-200 pt-4 ">
          <h2 className="text-lg  font-bold text-[rgba(114, 120, 127, 1)] mb-6">
            System Information
          </h2>
          <div className="text-sm text-gray-900 mb-6 ml-4">
            Current System Status and Configuration
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Environment Section */}
            <div>
              <h3 className="text-lg  font-bold text-[rgba(114, 120, 127, 1)] mb-4">
                Environment
              </h3>
              <div className="ml-4 space-y-2">
                <div className="text-sm text-gray-900">Node.js:v18+</div>
                <div className="text-sm text-gray-900">
                  Platform: Web Browser
                </div>
              </div>
            </div>

            {/* DataBase Section */}
            <div>
              <h3 className="text-lg  font-bold text-[rgba(114, 120, 127, 1)] mb-4">
                DataBase
              </h3>
              <div className="ml-4 space-y-2">
                <div className="text-sm text-gray-900">Status: Connected</div>
                <div className="text-sm text-gray-900">
                  Collections: User, Documents, Chats
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
