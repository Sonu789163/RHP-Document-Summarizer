import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LogOut,
  Settings,
  MessageSquare,
  Home,
  Upload,
  BarChart3,
  Users,
  LayoutDashboardIcon,
  RefreshCcw,
  UserPlus,
  SettingsIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SettingsModal from "./SettingsModal";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { WorkspaceInvitationPopover } from "./WorkspaceInvitationPopover";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "./ui/switch";
import { Bell } from "lucide-react";
import { notificationsService } from "@/services/api";

interface NavbarProps {
  title?: string;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  children?: React.ReactNode;
  onSidebarOpen?: () => void;
  sidebarOpen?: boolean;
  // RHP related props
  showRhpActions?: boolean;
  onUploadRhp?: () => void;
  onCompare?: () => void;
  hasRhp?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  showSearch = false,
  searchValue = "",
  onSearchChange,
  children,
  onSidebarOpen,
  sidebarOpen = false,
  showRhpActions = false,
  onUploadRhp,
  onCompare,
  hasRhp = false,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [workspaceOpen, setWorkspaceOpen] = React.useState(false);
  const [invitationOpen, setInvitationOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await notificationsService.list({ unread: true, page: 1, pageSize: 1 });
        if (active) setUnreadCount(res.total || 0);
      } catch { }
    };
    load();
    const id = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // Helper for initials
  const getUserInitials = (user: any) => {
    if (!user) return "U";

    // If user has a name, use first and last name initials
    if (user.name && user.name.trim()) {
      const nameParts = user.name.trim().split(" ");
      if (nameParts.length >= 2) {
        // First and last name initials
        return (
          nameParts[0][0] + nameParts[nameParts.length - 1][0]
        ).toUpperCase();
      } else {
        // Single name, use first two letters
        return user.name.substring(0, 2).toUpperCase();
      }
    }

    // Fallback to email initials
    if (user.email) {
      const [name] = user.email.split("@");
      return name
        .split(".")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }

    return "U";
  };

  // Example: adapt by route
  let displayTitle = title;
  let showBackArrow = false;
  if (!displayTitle) {
    if (location.pathname.startsWith("/doc/")) displayTitle = "PDF Summariser";
    else if (location.pathname.startsWith("/dashboard"))
      displayTitle = "PDF Summariser";
    else if (location.pathname.startsWith("/upload"))
      displayTitle = "Upload Documents";
    else if (location.pathname.startsWith("/settings"))
      displayTitle = "Settings";
    else displayTitle = "PDF Summariser";
  }

  // Show back arrow for admin pages, chat history, settings/profile pages, compare page, and notifications
  if (
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/chat-history") ||
    location.pathname.startsWith("/settings") ||
    location.pathname.startsWith("/profile") ||
    location.pathname.startsWith("/compare/") ||
    location.pathname.startsWith("/notifications")
  ) {
    showBackArrow = true;
  }
  // Show menu only on /doc/:namespace
  const isChatSummaryPage = /^\/doc\//.test(location.pathname);

  return (
    <>
      <header
        className={`w-full flex items-center h-[10vh] min-h-[60px] px-[4vw] bg-white border-b border-[#F3F3F3] relative transition-all duration-300`}
      >
        {/* Hamburger menu for chat summary page */}
        {isChatSummaryPage && onSidebarOpen && !sidebarOpen && (
          <button
            className={`absolute top-1/2 -translate-y-1/2 p-[0.5vw] rounded hover:bg-[#F3F3F3] transition-all duration-300 left-[1vw]`}
            onClick={onSidebarOpen}
          >
            <svg
              width="2vw"
              height="2vw"
              style={{ minWidth: 24, minHeight: 24 }}
              fill="none"
              stroke="#232323"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        )}
        <div className="flex items-center gap-4">
          {showBackArrow && (
            <button
              onClick={() => navigate(-1)}
              className="text-[#232323] hover:text-[#FF7A1A] transition-colors"
              title="Go back"
            >
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          )}
          <button
            onClick={() => navigate("/dashboard")}
            className={`text-2xl font-extrabold text-[#232323] tracking-tight transition-all duration-300 hover:text-[#FF7A1A] cursor-pointer ${isChatSummaryPage && sidebarOpen ? "ml-[-3vw]" : "ml-[0.5vw]"
              }`}
            style={{
              fontFamily: "Inter, Arial, sans-serif",
            }}
          >
            {displayTitle}
          </button>
        </div>
        {/* Show menu only on chat summary page */}

        <div className="flex-1" />
        {showSearch && location.pathname === "/dashboard" && (
          <input
            type="text"
            placeholder="Search for Files by their names, time, and day"
            className="outline-none focus:outline-none focus:ring-0 focus:border-[#E5E5E5] w-[60vw] max-w-xl rounded-full border border-[#E5E5E5] px-[2vw] py-[0.7vw] text-base bg-[#F9F9F9] placeholder:text-[#A1A1AA] mr-[2vw]"
            value={searchValue}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            style={{ marginRight: "2vw" }}
          />
        )}
        {children}

        {/* RHP Action Buttons */}
        {showRhpActions && (
          <div className="flex items-center gap-2 mr-1">
            {!hasRhp ? (
              <Button
                onClick={onUploadRhp}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-[#ECE9E2] text-[#4B2A06] hover:bg-[#ECE9E2] hover:shadow-sm"
              >
                <Upload className="h-4 w-4" />
                Upload RHP
              </Button>
            ) : (
              <Button
                onClick={onCompare}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-[#ECE9E2] text-[#4B2A06] hover:bg-[#ECE9E2] hover:shadow-sm"
              >
                <BarChart3 className="h-4 w-4" />
                Compare With RHP
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center ml-[2vw] gap-[2vw] text-[#232323] text-2xl">
          {/* Workspace Switcher (icon + hover popover, only on dashboard) */}
          {location.pathname === "/dashboard" && (
            <div
              onMouseEnter={() => setWorkspaceOpen(true)}
              onMouseLeave={() => setWorkspaceOpen(false)}
            >
              <Popover open={workspaceOpen}  onOpenChange={setWorkspaceOpen}>
                <PopoverTrigger asChild >
                  <RefreshCcw className="h-[1vw] w-[1vw] min-w-[24px] min-h-[24px]" />
                </PopoverTrigger>
                <PopoverContent className="w-[25vw] p-3 bg-white border border-gray-200" align="end" sideOffset={8}>
                  <WorkspaceSwitcher mode="list" />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Workspace Invitations (icon + click dialog, only for admin on admin routes) */}
          {(location.pathname.startsWith("/admin") ||
            location.pathname === "/admin") &&
            user?.role === "admin" && (
              <Dialog open={invitationOpen} onOpenChange={setInvitationOpen}>
                <DialogTrigger asChild>
                  <button
                    className={`flex items-center gap-2 text-2xl font-bold transition-colors ${invitationOpen ? "text-[#FF7A1A]" : "text-[#232323]"
                      }`}
                    title="Workspace Invitations"
                  >
                    <UserPlus className="h-[1vw] w-[1vw] min-w-[24px] min-h-[24px]" />
                  </button>
                </DialogTrigger>
                <DialogContent className="w-[90vw] max-w-[800px]  p-0" hideClose>
                  <WorkspaceInvitationPopover />
                </DialogContent>
              </Dialog>
            )}

          {isChatSummaryPage && (
            <nav className="flex gap-[2vw] ">
              <Link
                to={location.pathname}
                className={`flex items-center gap-2 text-2xl font-bold ${location.pathname.startsWith("/doc/")
                  ? "text-[#FF7A1A]"
                  : "text-[#232323]"
                  }`}
              >
                <MessageSquare className="h-[1vw] w-[1vw] min-w-[24px] min-h-[24px]" />
              </Link>
            </nav>
          )}
          {/* Compare BarChart icon for compare page */}
          {location.pathname.startsWith("/compare") && (
            <nav className="flex gap-[2vw]">
              <Link
                to={location.pathname}
                className={`flex items-center gap-2 text-2xl font-bold ${location.pathname.startsWith("/compare")
                  ? "text-[#FF7A1A]"
                  : "text-[#232323]"
                  }`}
                title="Compare"
              >
                <BarChart3 className="h-[1vw] w-[1vw] min-w-[24px] min-h-[24px]" />
              </Link>
            </nav>
          )}

          <Link
            to="/dashboard"
            className={`flex items-center gap-2 text-2xl font-bold ${location.pathname === "/dashboard"
              ? "text-[#FF7A1A]"
              : "text-[#232323]"
              }`}
          >
            <Home className="h-[1vw] w-[1vw] min-w-[24px] min-h-[24px]" />
          </Link>

          {/* Admin Navigation Links */}
          {user?.role === "admin" && (
            <>
              <Link
                to="/admin"
                className={`flex items-center gap-2 text-2xl font-bold ${location.pathname === "/admin"
                  ? "text-[#FF7A1A]"
                  : "text-[#232323]"
                  }`}
                title="Admin Dashboard"
              >
                <LayoutDashboardIcon className="h-[1vw] w-[1vw] min-w-[24px] min-h-[24px]" />
              </Link>

              {/* Domain Configuration link removed */}
            </>
          )}
          {/* Notifications */}
          <Link
            to="/notifications"
            className={`relative flex items-center gap-2 text-2xl font-bold ${location.pathname === "/notifications" ? "text-[#FF7A1A]" : "text-[#232323]"
              }`}
            title="Notifications"
          >
            <Bell className="h-[1vw] w-[1vw] min-w-[24px] min-h-[24px]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
          {/* Settings icon */}

          {/* User Avatar Dropdown */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span className="cursor-pointer">
                  <Avatar className="h-10 w-10 min-w-[35px] min-h-[35px] hover:shadow-lg transition-all duration-300">
                    <AvatarFallback className="bg-[#ECE9E2] text-[#4B2A06]">
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white border border-gray-200 text-[#4B2A06]" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.name || user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => navigate("/profile")}
                  className="cursor-pointer hover:bg-gray-100 focus:bg-gray-100 "
                >

                  <SettingsIcon className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                {user?.role === "admin" && (
                  <>

                    <DropdownMenuItem
                      onSelect={() => navigate("/admin/users")}
                      className="cursor-pointer hover:bg-gray-100 focus:bg-gray-100 "
                    >
                      <Users className="mr-2 h-4 w-4" />
                      <span>User Management</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => navigate("/admin/workspaces")}
                      className="cursor-pointer hover:bg-gray-100 focus:bg-gray-100 "
                    >
                      <LayoutDashboardIcon className="mr-2 h-4 w-4" />
                      <span>Workspace Management</span>
                    </DropdownMenuItem>
                    {/* Domain Configuration menu removed */}
                  </>
                )}
                <DropdownMenuItem
                  onSelect={() => logout()}
                  className="cursor-pointer hover:bg-gray-100 focus:bg-gray-100"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </header>
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
};
