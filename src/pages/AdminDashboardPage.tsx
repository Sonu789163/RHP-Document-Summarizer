// Admin dashboard: aggregates stats and management UIs for documents, summaries,
// reports, chats, and workspaces. Admin-only access enforced via role check.
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  MoreVertical,
  Eye,
  Share2,
  Plus,
  Check,
  X,
  Pencil,
  Divide,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { DocumentPopover } from "@/components/ChatPanel";
import { ShareDialog } from "../components/ShareDialog";
import { ViewSummaryModal } from "@/components/ViewSummaryModal";
import { ViewReportModal } from "@/components/ViewReportModal";
import { WorkspaceRequestsManager } from "../components/WorkspaceRequestsManager";
import { InviteeManagement } from "../components/InviteeManagement";
import { workspaceService, WorkspaceDTO } from "../services/workspaceService";
import { CreateWorkspaceModal } from "../components/CreateWorkspaceModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  documentService,
  chatService,
  summaryService,
  reportService,
  directoryService,
} from "../services/api";
import { userService } from "../lib/api/userService";
import { Separator } from "@radix-ui/react-dropdown-menu";

interface Document {
  id: string;
  _id: string;
  name: string;
  createdAt: string;
  createdBy?: string;
  namespace?: string;
  userId?: string;
  microsoftId?: string;
  workspaceId?: {
    workspaceId: string;
    name: string;
    slug: string;
  };
}

interface Summary {
  id: string;
  documentId: string;
  updatedAt: string;
  createdBy?: string;
  title?: string;
  userId?: string;
  microsoftId?: string;
  workspaceId?: {
    workspaceId: string;
    name: string;
    slug: string;
  };
}

interface Report {
  id: string;
  drhpNamespace: string;
  updatedAt: string;
  userId?: string;
  microsoftId?: string;
  workspaceId?: {
    workspaceId: string;
    name: string;
    slug: string;
  };
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
  totalDirectories: number;
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
  const [directories, setDirectories] = useState<any[]>([]);
  const [shareDirId, setShareDirId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [viewSummaryId, setViewSummaryId] = useState<string | null>(null);
  const [viewReportId, setViewReportId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatStats, setChatStats] = useState<ChatStats | null>(null);
  const [chatsLast30Days, setChatsLast30Days] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [avgMessages, setAvgMessages] = useState(0);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reportsFilter, setReportsFilter] = useState("7");
  const [reportsSearch, setReportsSearch] = useState("");
  const [workspaces, setWorkspaces] = useState<WorkspaceDTO[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceDTO | null>(null);
  const [editingName, setEditingName] = useState("");
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [addUsersOpen, setAddUsersOpen] = useState(false);
  const [removeUsersOpen, setRemoveUsersOpen] = useState(false);
  const [viewRequestsOpen, setViewRequestsOpen] = useState(false);
  const [targetWorkspace, setTargetWorkspace] = useState<WorkspaceDTO | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<Array<{ _id: string; name?: string; email: string; status: string; role: string }>>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const currentUserId = String((user as any)?.id || (user as any)?._id || "");

  // Real stats fetched from backend
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDocuments: 0,
    totalReports: 0,
    totalSummaries: 0,
    totalChats: 0,
    totalDirectories: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadWorkspaces = async () => {
    try {
      setWorkspacesLoading(true);
      const data = await workspaceService.listWorkspaces();
      const items = data.workspaces || [];
      // Only show actual workspaces from database, no fake "default" workspace
      // Use workspace.name (not slug) for display
      setWorkspaces(items);
    } catch (error) {
      console.error("Error loading workspaces:", error);
      toast.error("Failed to load workspaces");
    } finally {
      setWorkspacesLoading(false);
    }
  };

  const handleRenameWorkspace = async (workspace: WorkspaceDTO) => {
    if (!editingName.trim()) return;
    try {
      await workspaceService.updateWorkspace(workspace.workspaceId, { name: editingName.trim() });
      toast.success("Workspace renamed successfully");
      setEditingWorkspace(null);
      setEditingName("");
      loadWorkspaces();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to rename workspace");
    }
  };

  const handleDeleteWorkspace = async (workspace: WorkspaceDTO) => {
    if (!confirm(`Are you sure you want to archive workspace "${workspace.name}"?`)) return;
    try {
      await workspaceService.archiveWorkspace(workspace.workspaceId);
      toast.success("Workspace archived successfully");
      loadWorkspaces();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to archive workspace");
    }
  };

  const openAddUsers = async (workspace: WorkspaceDTO) => {
    try {
      setTargetWorkspace(workspace);
      setSelectedUserIds([]);
      setUserSearch("");
      const res = await workspaceService.listMembers(workspace.workspaceId);
      setWorkspaceMembers(res.members || []);
      setAddUsersOpen(true);
    } catch (e) {
      toast.error("Failed to open add users");
    }
  };

  const openRemoveUsers = async (workspace: WorkspaceDTO) => {
    try {
      setTargetWorkspace(workspace);
      setSelectedUserIds([]);
      setUserSearch("");
      const res = await workspaceService.listMembers(workspace.workspaceId);
      setWorkspaceMembers(res.members || []);
      setRemoveUsersOpen(true);
    } catch (e) {
      toast.error("Failed to open remove users");
    }
  };

  const filteredAddableUsers = (users || []).filter((u: any) => {
    const already = workspaceMembers.some((m) => m._id === u._id);
    const matches = (u.name || u.email || "").toLowerCase().includes(userSearch.toLowerCase());
    const notSelf = String(u._id) !== currentUserId;
    return !already && matches && notSelf;
  });

  const filteredRemovableUsers = workspaceMembers.filter((m) => {
    const matches = (m.name || m.email || "").toLowerCase().includes(userSearch.toLowerCase());
    const notSelf = String(m._id) !== currentUserId;
    const notAdmin = (m as any).role !== "admin"; // do not show admins in remove list
    return matches && notSelf && notAdmin;
  });

  const toggleSelected = (id: string) => {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleAddUsersConfirm = async () => {
    if (!targetWorkspace) return;
    try {
      await Promise.all(
        selectedUserIds.map((id) => workspaceService.addMember(targetWorkspace.workspaceId, { userId: id }))
      );
      toast.success("Users added");
      setAddUsersOpen(false);
      loadWorkspaces();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to add users");
    }
  };

  const handleRemoveUsersConfirm = async () => {
    if (!targetWorkspace) return;
    try {
      await Promise.all(
        selectedUserIds.map((id) => workspaceService.removeMember(targetWorkspace.workspaceId, id))
      );
      toast.success("Users removed");
      setRemoveUsersOpen(false);
      loadWorkspaces();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to remove users");
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadDashboardData = async () => {
    try {
      setDashboardLoading(true);
      console.log("Loading dashboard data for user:", user);

      // Load user statistics and all users
      const userData = await userService.getUserStats();
      setUserStats(userData);

      // Load all users for name mapping
      const allUsers = await userService.getAllUsers({ limit: 1000 });
      setUsers(allUsers.users);

      // Load documents (admin view - all workspaces)
      console.log("Loading admin documents...");
      const docs = await documentService.getAllAdmin();
      console.log("Admin documents loaded:", docs);
      setDocuments(docs);
      setDocumentsLoading(false);

      // Load summaries (admin view - all workspaces)
      const sums = await summaryService.getAllAdmin();
      setSummaries(sums);
      setSummariesLoading(false);

      // Load reports (admin view - all workspaces)
      const reps = await reportService.getAllAdmin();
      setReports(reps);
      setReportsLoading(false);

      // Load all directories recursively starting from root
      const fetchAllDirectories = async (): Promise<any[]> => {
        const result: any[] = [];
        const queue: (string | null)[] = ["root"]; // start at root
        const seen = new Set<string | null>();
        while (queue.length) {
          const current = queue.shift()!;
          if (seen.has(current)) continue;
          seen.add(current);
          try {
            const data = await directoryService.listChildren(current as any);
            const dirs = (data?.items || [])
              .filter((x: any) => x.kind === "directory")
              .map((x: any) => x.item);
            result.push(...dirs);
            for (const d of dirs) {
              queue.push(d.id);
            }
          } catch (e) {
            // ignore errors and continue
          }
        }
        return result;
      };

      const dirs = await fetchAllDirectories();
      setDirectories(dirs);

      // Load chats and chat stats
      const chatData = await chatService.getStats();
      setChatStats(chatData);

      // Load all chats for accurate calculations and recents
      const allChats = await chatService.getAllAdmin();
      setRecentChats((allChats || []).slice(0, 3));

      // Calculate chats from last 30 days using actual chats
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const chats30 = (allChats || []).filter((c: any) => {
        const d = new Date(c.createdAt || c.updatedAt || Date.now());
        return d >= thirtyDaysAgo;
      });
      setChatsLast30Days(chats30.length);

      // Active users: deduplicate using real users list to avoid double-counting (userId vs microsoftId)
      const activeUserIdSet: Set<string> = new Set();
      for (const c of allChats || []) {
        const found = (allUsers.users || []).find(
          (u: any) =>
            (c.userId && u._id === c.userId) ||
            (c.microsoftId && u.microsoftId === c.microsoftId) ||
            (c.userEmail && u.email === c.userEmail)
        );
        if (found && found._id) activeUserIdSet.add(String(found._id));
      }
      setActiveUsers(activeUserIdSet.size);

      // Average messages per chat: prefer stats, fallback to messageCount
      if (Array.isArray(chatData?.messagesPerChat) && chatData!.messagesPerChat.length) {
        const sum = chatData!.messagesPerChat.reduce(
          (acc: number, it: any) => acc + (Number(it.count) || 0),
          0
        );
        setAvgMessages(Math.round(sum / chatData!.messagesPerChat.length));
      } else if ((allChats || []).length) {
        const sum = (allChats || []).reduce(
          (acc: number, it: any) => acc + (Number(it.messageCount) || 0),
          0
        );
        setAvgMessages(Math.round(sum / Math.max((allChats || []).length, 1)));
      } else {
        setAvgMessages(0);
      }

      setChatsLoading(false);

      // Update stats with real data
      setStats({
        totalUsers: userData?.total || 0,
        totalDocuments: Array.isArray(docs) ? docs.length : 0,
        totalReports: Array.isArray(reps) ? reps.length : 0,
        totalSummaries: Array.isArray(sums) ? sums.length : 0,
        totalChats: chatData?.totalChats || (allChats || []).length || 0,
        totalDirectories: Array.isArray(dirs) ? dirs.length : 0,
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
      toast.error("Error downloading document: " + (error as any).message);
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
      const blob = await summaryService.downloadHtmlPdf(summary.id);
      if (blob.type !== "application/pdf" || blob.size < 100) {
        throw new Error("Failed to generate PDF. Please try again later.");
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${summary.title || "summary"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.dismiss(loadingToast);
      toast.success("Summary PDF downloaded successfully");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error downloading summary PDF: " + (error as any).message);
      console.error("Error downloading summary PDF:", error);
    }
  };

  const handleDownloadSummaryDocx = async (summary: Summary) => {
    let loadingToast;
    try {
      loadingToast = toast.loading("Download processing...");
      const blob = await summaryService.downloadDocx(summary.id);
      
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
      const a = document.createElement("a");
      a.href = url;
      a.download = `${summary.title || "summary"}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.dismiss(loadingToast);
      toast.success("Summary DOCX downloaded successfully");
    } catch (error: any) {
      toast.dismiss(loadingToast);
      const errorMessage = error?.message || "Failed to download DOCX";
      toast.error(errorMessage);
      console.error("Error downloading summary DOCX:", error);
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
      const blob = await reportService.downloadHtmlPdf(report.id);
      if (blob.type !== "application/pdf" || blob.size < 100) {
        throw new Error("Failed to generate PDF. Please try again later.");
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.drhpNamespace || "report"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.dismiss(loadingToast);
      toast.success("Report PDF downloaded successfully");
    } catch (error: any) {
      toast.dismiss(loadingToast);
      const errorMessage = error?.message || "Failed to download PDF";
      toast.error(errorMessage);
      console.error("Error downloading report PDF:", error);
    }
  };

  const handleDownloadReportDocx = async (report: Report) => {
    let loadingToast;
    try {
      loadingToast = toast.loading("Download processing...");
      const blob = await reportService.downloadDocx(report.id);
      
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
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.drhpNamespace || "report"}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.dismiss(loadingToast);
      toast.success("Report DOCX downloaded successfully");
    } catch (error: any) {
      toast.dismiss(loadingToast);
      const errorMessage = error?.message || "Failed to download DOCX";
      toast.error(errorMessage);
      console.error("Error downloading report DOCX:", error);
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
          <h1 className="text-2xl font-bold text-[#4B2A06] mb-4">
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Top Section - Responsive Grid: Key Metrics + Reports Chart + Management Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start ">
          {/* Left Column- Total Chats Chart */}
          <div className="lg:col-span-2 my-4  border-t border-gray-100 bg-white flex flex-col shadow-sm rounded-lg items-center p-6 self-start">
            <div className="text-lg  font-bold text-[#4B2A06] my-5">
              Total Chats
            </div>
            <div className="relative mt-2 w-32 h-32 lg:w-40 lg:h-40">
              <svg
                className="w-full h-full transform -rotate-90"
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
                <span className="text-2xl lg:text-3xl font-bold text-[#4B2A06]">
                  {stats.totalChats}
                </span>
              </div>
            </div>
          </div>
          {/*  Middle Column - Key Metrics */}
          <div className="lg:col-span-3 mt-4 ">
            <div className="grid grid-cols-2 gap-3">
              <div className="shadow-sm  bg-white rounded-lg">
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

              <div className="shadow-sm bg-white rounded-lg">
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

              <div className="shadow-sm bg-white rounded-lg">
                <CardHeader className="flex flex-row items-center space-y-0  pb-2">
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

              <div className="shadow-sm  bg-white rounded-lg">
                <CardHeader className="flex flex-row items-center space-y-0  pb-2">
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

          

          {/* Right Columns - Management Lists */}
          <div className="lg:col-span-7 grid grid-cols-1 xl:grid-cols-2  border-l border-gray-200 pl-2">
            {/* Document Management */}
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#4B2A06] mb-3">
                Document Management
              </h2>
              <div className="text-sm font-medium text-gray-600 mb-3">
                All Documents ({documents.length})
              </div>
              <div className="h-[25vh] overflow-y-auto  scrollbar-hide ">
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
                      className="flex items-center justify-between px-2 py-2  bg-white rounded-lg hover:bg-gray-50 border-b border-gray-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4  text-gray-600" />
                        <div className="min-w-0">
                          <div
                            className="font-medium text-[#4B2A06] text-sm truncate"
                            title={(doc.name || doc.namespace || `Document ${index + 1}`) as string}
                            style={{ maxWidth: '200px' }}
                          >
                            {(doc.name || doc.namespace || `Document ${index + 1}`).length > 25 
                              ? `${(doc.name || doc.namespace || `Document ${index + 1}`).substring(0, 25)}...`
                              : (doc.name || doc.namespace || `Document ${index + 1}`)
                            }
                          </div>
                          <div className="text-xs text-gray-500">
                            Created: {formatDate(doc.createdAt)}
                          </div>
                          <div className="text-xs text-[#4B2A06] font-bold">
                            Workspace: {doc.workspaceId?.name || "excollo"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="More actions"
                            >
                              <MoreVertical className="h-4 w-4 text-gray-600" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white w-48 border border-gray-200">
                            <DropdownMenuItem
                              onClick={() => handleDownloadDocument(doc)}
                              className="flex items-center gap-2 cursor-pointer hover:bg-white data-[highlighted]:bg-gray-50"
                            >
                              <Download className="h-4 w-4" />
                              <span>Download</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer hover:bg-white data-[highlighted]:bg-gray-50">
                              <Eye className="h-4 w-4" />
                              <DocumentPopover
                                documentId={doc.id as string}
                                documentName={(doc.namespace || doc.name || "Document") as string}
                                renderAsButton
                                buttonLabel="View Document"
                                buttonClassName="text-sm text-[#4B2A06]"
                              />
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteDocument(doc)}
                              className="flex items-center gap-2 cursor-pointer hover:bg-white data-[highlighted]:bg-gray-50 text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* Summary Management */}
            <div className="p-4">
              <div>
                <h2 className="text-xl font-bold text-[#4B2A06] mb-3">
                  Summary Management
                </h2>
                <div className="text-sm font-medium text-gray-600 mb-3">
                  All Summaries ({summaries.length})
                </div>
                <div className="h-[25vh] overflow-y-auto  overflow-x-none  pr-2 scrollbar-hide">
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
                        className={`flex items-center justify-between p-2 rounded-lg bg-white hover:bg-[rgba(62, 36, 7, 0.13)] border-b border-gray-200 ${
                          index === 0
                            ? "bg-[rgba(62, 36, 7, 0.13)] border-amber-200"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-4 w-4 text-gray-600" />
                          <div className="min-w-0">
                            <div
                              className="font-medium text-[#4B2A06] flex items-center gap-2 text-sm truncate"
                              title={(summary.title || `Summary ${index + 1}`) as string}
                              style={{ maxWidth: '200px' }}
                            >
                              {(summary.title || `Summary ${index + 1}`).length > 25 
                                ? `${(summary.title || `Summary ${index + 1}`).substring(0, 25)}...`
                                : (summary.title || `Summary ${index + 1}`)
                              }
                            </div>
                            <div className="text-xs text-gray-500">
                              Created:{" "}
                              {formatDate(summary.updatedAt)}
                            </div>
                            <div className="text-xs text-[#4B2A06] font-bold">
                              Workspace: {summary.workspaceId?.name || 'Unknown'}
                            </div>
                            {index === 0 && (
                              <div className="text-xs text-gray-500 font-medium">
                                Latest Summary
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                title="More actions"
                              >
                                <MoreVertical className="h-4 w-4 text-gray-600" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white w-56 border border-gray-200">
                              <DropdownMenuItem
                                onClick={() => handleDownloadSummaryPdf(summary)}
                                className="flex items-center gap-2 cursor-pointer hover:bg-white data-[highlighted]:bg-gray-50"
                              >
                                <Download className="h-4 w-4" />
                                <span>Download PDF</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setViewSummaryId(summary.id)}
                                className="flex items-center gap-2 cursor-pointer hover:bg-white data-[highlighted]:bg-gray-50"
                              >
                                <Eye className="h-4 w-4" />
                                <span>View</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDownloadSummaryDocx(summary)}
                                className="flex items-center gap-2 cursor-pointer hover:bg-white data-[highlighted]:bg-gray-50"
                              >
                                <FileText className="h-4 w-4" />
                                <span>Download DOCX</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate(`/doc/${summary.documentId}`)}
                                className="flex items-center gap-2 cursor-pointer hover:bg-white data-[highlighted]:bg-gray-50"
                              >
                                <Eye className="h-4 w-4" />
                                <span>View Document</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteSummary(summary)}
                                className="flex items-center gap-2 cursor-pointer hover:bg-white data-[highlighted]:bg-gray-50 text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Directories Management Section */}
        <div className="mt-8 border-t border-gray-200 pt-6">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
         <h2 className="text-2xl font-bold text-[#4B2A06] mb-2 sm:mb-0">Directory Management</h2>
          <div className="text-md font-bold text-[#4B2A06]">
            Total Directories : {directories.length}
          </div>
         </div>
          <div className="max-h-[35vh] overflow-y-auto  pr-2 scrollbar-hide">
            {directories.length === 0 ? (
              <div className="text-center py-4 text-gray-600">No directories found</div>
            ) : (
              directories.map((dir) => (
                <div key={dir.id} className="flex items-center justify-between p-2 rounded-lg bg-white hover:bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7h5l2 3h11v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <path d="M3 7V5a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v3"/>
                    </svg>
                    <div>
                      <div className="font-medium text-[#4B2A06] text-sm">{dir.name}</div>
                      <div className="text-xs text-gray-500">ID: {dir.id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1 text-sm hover:text-[#4B2A06]  "
                      onClick={() => { setShareDirId(dir.id); setShareOpen(true); }}
                      title="Share directory"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      className="px-3 py-1 text-sm hover:text-red-600  "
                      onClick={async () => {
                        if (!window.confirm(`Delete folder "${dir.name}" and all documents inside?`)) return;
                        try {
                          await directoryService.delete(dir.id);
                          const updated = directories.filter((d) => d.id !== dir.id);
                          setDirectories(updated);
                          setStats((prev) => ({ ...prev, totalDirectories: Math.max((prev.totalDirectories || 1) - 1, 0) }));
                        } catch (e) {
                          console.error('Failed to delete directory', e);
                          toast.error('Failed to delete directory');
                        }
                      }}
                      title="Delete directory"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <ShareDialog
          resourceType="directory"
          resourceId={shareDirId}
          open={shareOpen}
          onOpenChange={(o) => { setShareOpen(o); if (!o) setShareDirId(null); }}
        />

        <ViewSummaryModal
          summaryId={viewSummaryId}
          open={!!viewSummaryId}
          onOpenChange={(o) => { if (!o) setViewSummaryId(null); }}
          title="Summary Preview"
        />
        <ViewReportModal
          reportId={viewReportId}
          open={!!viewReportId}
          onOpenChange={(o) => { if (!o) setViewReportId(null); }}
          title="Report Preview"
        />

        <CreateWorkspaceModal
          open={createWorkspaceOpen}
          onOpenChange={setCreateWorkspaceOpen}
          onCreated={() => {
            loadWorkspaces();
            setCreateWorkspaceOpen(false);
          }}
        />

        <Dialog open={addUsersOpen} onOpenChange={setAddUsersOpen}>
          <DialogContent className="sm:max-w-lg bg-white">
            <DialogHeader>
              <DialogTitle className="text-[#4B2A06]">Add users to {targetWorkspace?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Search users by name or email"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="bg-white border-gray-300 text-[#4B2A06]"
              />
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded">
                {filteredAddableUsers.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">No users found</div>
                ) : (
                  filteredAddableUsers.map((u: any) => (
                    <label key={u._id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u._id)}
                        onChange={() => toggleSelected(u._id)}
                      />
                      <div className="flex-1">
                        <div className="text-sm text-[#4B2A06]">{u.name || u.email}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddUsersOpen(false)} className="bg-white text-[#4B2A06] border-gray-300 hover:bg-gray-50">Cancel</Button>
              <Button onClick={handleAddUsersConfirm} disabled={selectedUserIds.length === 0} className="bg-[#4B2A06] text-white hover:bg-[#3A2004]">Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={removeUsersOpen} onOpenChange={setRemoveUsersOpen}>
          <DialogContent className="sm:max-w-lg bg-white">
            <DialogHeader>
              <DialogTitle className="text-[#4B2A06]">Remove users from {targetWorkspace?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Search members"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="bg-white border-gray-300 text-[#4B2A06]"
              />
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded">
                {filteredRemovableUsers.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">No members found</div>
                ) : (
                  filteredRemovableUsers.map((m: any) => (
                    <label key={m._id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(m._id)}
                        onChange={() => toggleSelected(m._id)}
                      />
                      <div className="flex-1">
                        <div className="text-sm text-[#4B2A06]">{m.name || m.email}</div>
                        <div className="text-xs text-gray-500">{m.email}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemoveUsersOpen(false)} className="bg-white text-[#4B2A06] border-gray-300 hover:bg-gray-50">Cancel</Button>
              <Button onClick={handleRemoveUsersConfirm} disabled={selectedUserIds.length === 0} className="bg-[#4B2A06] text-white hover:bg-[#3A2004]">Remove</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bottom Section - Quick View */}
        <div className="mt-8 border-t border-gray-200 pt-6">
          <h2 className="text-2xl font-bold text-[#4B2A06] mb-6">Quick View</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              className="bg-[#637587] text-white cursor-pointer  transition-colors"
              onClick={() => navigate("/admin/users")}
            >
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">User Management</h3>
                <p className="text-sm text.white/80">
                  Manage User Roles and Permissions
                </p>
              </CardContent>
            </Card>

            {/* Domain Configuration card removed */}

            <Card
              className="bg-[#637587] text-white cursor-pointer hover:bg-[#637587] transition-colors"
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
              className="bg-[#637587] text-white cursor-pointer hover:bg-[#637587] transition-colors"
              onClick={() => navigate("/chat-history")}
            >
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Chat Management</h3>
                <p className="text-sm text-white/80">Manage chats history</p>
              </CardContent>
            </Card>

            <Card
              className="bg-[#637587] text-white cursor-pointer hover:bg-[#637587] transition-colors"
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
        <div className="w-full mx-auto mt-8 border-t border-gray-200 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Chat Statistics */}
            <div className="lg:col-span-4 border-r border-gray-200 pr-6">
              <h2 className="text-2xl font-bold text-[#4B2A06] ">
                Chat Management
              </h2>
              <div className="grid grid-cols-2 gap-4 p-3">
                <div className="shadow-sm bg-white rounded-lg" >
                  <CardHeader className="flex flex-row items-center space-y-0 ">
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

                <div className="shadow-sm bg-white rounded-lg">
                  <CardHeader className="flex flex-row items-center space-y-0 ">
                    <CardTitle className="text-md font-bold text-[rgba(114, 120, 127, 1)]">
                      Avg Messages
                    </CardTitle>
                    <BarChart3 className="h-4 ml-2 w-4 text-[rgba(114, 120, 127, 1)]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl ml-2 font-bold text-[rgba(38,40,43,1)]">
                      {dashboardLoading ? (
                        <div className="animate-pulse bg-white/20 h-8 w-16 rounded"></div>
                      ) : (
                        avgMessages
                      )}
                    </div>
                  </CardContent>
                </div>

                <div className="shadow-sm bg-white rounded-lg">
                  <CardHeader className="flex flex-row items-center space-y-0 ">
                    <CardTitle className="text-md font-bold text-[rgba(114, 120, 127, 1)]">
                      Last 30 days
                    </CardTitle>
                    <FileText className="h-4 ml-2 w-4 text-[rgba(114, 120, 127, 1)]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl ml-2 font-bold text-[rgba(38,40,43,1)]">
                      {dashboardLoading ? (
                        <div className="animate-pulse bg.white/20 h-8 w-16 rounded"></div>
                      ) : (
                        chatsLast30Days
                      )}
                    </div>
                  </CardContent>
                </div>

                <div className="shadow-sm bg-white rounded-lg">
                  <CardHeader className="flex flex-row items-center space-y-0 ">
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
                        activeUsers
                      )}
                    </div>
                  </CardContent>
                </div>
              </div>
            </div>
            
            {/* Right Column - Recent Chat Sessions */}
            <div className="lg:col-span-8">
              <h3 className="text-2xl font-bold text-[#4B2A06] mb-5">
                Recent Chat Sessions
              </h3>
              <div >
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
                      className="flex items-center justify-between p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        {/* User Avatar */}
                        <div className="w-10 h-10 bg-[#637587] text-white rounded-full flex items-center justify-center  font-semibold text-sm">
                          {getUserName(chat.userId, chat.microsoftId)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-[#4B2A06] text-sm">
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
        <div className="mt-8 border-t border-gray-200 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#4B2A06] mb-2 sm:mb-0">
            Report Management
          </h2>
          <div className="text-md font-bold text-[#4B2A06]">
            Total Reports : {reports.length}
          </div>
          </div>
          <div className="h-[40vh] overflow-y-auto  pr-2 scrollbar-hide">
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
                  className="flex items-center justify-between p-2 rounded-lg bg-white hover:bg-gray-50 border-b border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <div>
                      <div className="font-medium text-[#4B2A06] text-sm">
                        Report For Document: {report.drhpNamespace}
                      </div>
                      <div className="text-xs text-gray-500">
                        Document: {report.drhpNamespace}
                      </div>
                      <div className="text-xs text-[#4B2A06] font-bold">
                        Workspace: {report.workspaceId?.name || 'Unknown'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu >
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="More actions"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-600" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-white w-56 border border-gray-200 " align="end" >
                        <DropdownMenuItem
                          onClick={() => handleDownloadReportPdf(report)}
                          className="flex items-center gap-2 cursor-pointer hover:bg-white data-[highlighted]:bg-gray-50"
                        >
                          <Download className="h-4 w-4 " />
                          <span>Download PDF</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setViewReportId(report.id)}
                          className="flex items-center gap-2 cursor-pointer hover:bg-white data-[highlighted]:bg-gray-50"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDownloadReportDocx(report)}
                          className="flex items-center gap-2 cursor-pointer hover.bg-white data-[highlighted]:bg-gray-50"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Download DOCX</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteReport(report)}
                          className="flex items-center gap-2 cursor-pointer hover:bg-white data-[highlighted]:bg-gray-50 text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Workspace Management Section */}
        <div className="mt-8 border-t border-gray-200 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#4B2A06] mb-4 sm:mb-0">
              Workspace Management
            </h2>
            <button
              onClick={() => setCreateWorkspaceOpen(true)}
              className="px-4 py-2 bg-[#4B2A06] text-white rounded-lg hover:bg-[#3A2004] transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Workspace
            </button>
          </div>
          <div className="text-sm font-medium text-gray-600 mb-3">
            All Workspaces ({workspaces.length})
          </div>
          <div className="max-h-[30vh]  overflow-y-auto pr-2 scrollbar-hide">
            {workspacesLoading ? (
              <div className="text-center py-4 text-gray-600">
                Loading workspaces...
              </div>
            ) : workspaces.length === 0 ? (
              <div className="text-center py-4 text-gray-600">
                No workspaces found
              </div>
            ) : (
              workspaces.map((workspace) => (
                <div
                  key={workspace.workspaceId}
                  className="flex items-center justify-between p-3 rounded-lg bg-white hover:bg-gray-50 border-b border-gray-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: workspace.color || "#4B2A06" }}
                    />
                    <div className="min-w-0">
                      {editingWorkspace?.workspaceId === workspace.workspaceId ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-48"
                            placeholder="Workspace name"
                          />
                          <button
                            onClick={() => handleRenameWorkspace(workspace)}
                            className="text-green-600 hover:text-green-700"
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingWorkspace(null);
                              setEditingName("");
                            }}
                            className="text-gray-500 hover:text-gray-700"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium text-[#4B2A06] text-sm">
                            {workspace.name || workspace.workspaceId}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {workspace.workspaceId} • {workspace.status}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {editingWorkspace?.workspaceId !== workspace.workspaceId && (
                      <>
                        <button
                          onClick={() => openAddUsers(workspace)}
                          className="px-2 py-1 text-sm rounded bg-white text-[#4B2A06] border border-gray-200 hover:bg-gray-50"
                        >
                          Add user
                        </button>
                        <button
                          onClick={() => openRemoveUsers(workspace)}
                          className="px-2 py-1 text-sm rounded bg-white text-[#4B2A06] border border-gray-200 hover:bg-gray-50"
                        >
                          Remove user
                        </button>
                        <button
                          onClick={() => {
                            setTargetWorkspace(workspace);
                            setViewRequestsOpen(true);
                          }}
                          className="px-2 py-1 text-sm rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                          title="View requests"
                        >
                          Requests
                        </button>
                        <button
                          onClick={() => {
                            setEditingWorkspace(workspace);
                            setEditingName(workspace.name);
                          }}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Rename workspace"
                        >
                          <Pencil className="h-4 w-4 text-gray-600" />
                        </button>
                        {workspace.workspaceId !== "default" && (
                          <button
                            onClick={() => handleDeleteWorkspace(workspace)}
                            className="p-1 hover:bg-red-50 rounded transition-colors"
                            title="Archive workspace"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <Separator className="border-t border-gray-200 mt-5" />
        {/* Workspace Request Management Dialog */}
        <Dialog open={viewRequestsOpen} onOpenChange={setViewRequestsOpen}>
          <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Workspace Access Requests</DialogTitle>
            </DialogHeader>
            {targetWorkspace && (
              <WorkspaceRequestsManager
                workspaceId={targetWorkspace.workspaceId}
                workspaceName={targetWorkspace.name}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Workspace Invitation Management Section */}
        <div className="mt-8  pt-6 space-y-6">
          {/* Invitee Management - List of all members and their access */}
          <InviteeManagement />
          
        </div>

        
      </div>
    </div>
  );
}
