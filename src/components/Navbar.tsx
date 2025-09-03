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
  User,
  Users,
  Globe,
  Shield,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SettingsModal from "./SettingsModal";

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

  // Show back arrow for admin pages, chat history, and settings/profile pages
  if (
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/chat-history") ||
    location.pathname.startsWith("/settings") ||
    location.pathname.startsWith("/profile")
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
            className={`text-2xl font-extrabold text-[#232323] tracking-tight transition-all duration-300 hover:text-[#FF7A1A] cursor-pointer ${
              isChatSummaryPage && sidebarOpen ? "ml-[-3vw]" : "ml-[0.5vw]"
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
        {showSearch && (
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
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload RHP
              </Button>
            ) : (
              <Button
                onClick={onCompare}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Compare With RHP
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center ml-[2vw] gap-[2vw] text-[#232323] text-2xl">
          {isChatSummaryPage && (
            <nav className="flex gap-[2vw] ">
              <Link
                to={location.pathname}
                className={`flex items-center gap-2 text-2xl font-bold ${
                  location.pathname.startsWith("/doc/")
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
                className={`flex items-center gap-2 text-2xl font-bold ${
                  location.pathname.startsWith("/compare")
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
            className={`flex items-center gap-2 text-2xl font-bold ${
              location.pathname === "/dashboard"
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
                className={`flex items-center gap-2 text-2xl font-bold ${
                  location.pathname === "/admin"
                    ? "text-[#FF7A1A]"
                    : "text-[#232323]"
                }`}
                title="Admin Dashboard"
              >
                <Shield className="h-[1vw] w-[1vw] min-w-[24px] min-h-[24px]" />
              </Link>
              <Link
                to="/admin/users"
                className={`flex items-center gap-2 text-2xl font-bold ${
                  location.pathname === "/admin/users"
                    ? "text-[#FF7A1A]"
                    : "text-[#232323]"
                }`}
                title="User Management"
              >
                <Users className="h-[1vw] w-[1vw] min-w-[24px] min-h-[24px]" />
              </Link>
              <Link
                to="/admin/domains"
                className={`flex items-center gap-2 text-2xl font-bold ${
                  location.pathname === "/admin/domains"
                    ? "text-[#FF7A1A]"
                    : "text-[#232323]"
                }`}
                title="Domain Configuration"
              >
                <Globe className="h-[1vw] w-[1vw] min-w-[24px] min-h-[24px]" />
              </Link>
            </>
          )}
          {/* Settings icon */}
          <span
            className="cursor-pointer"
            onClick={() => navigate("/profile")}
            title="Settings"
          >
            <svg
              width="1vw"
              height="1vw"
              style={{ minWidth: 24, minHeight: 24 }}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-settings"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09c0 .66.39 1.25 1 1.51a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8c.66 0 1.25.39 1.51 1H21a2 2 0 0 1 0 4h-.09c-.66 0-1.25.39-1.51 1Z"></path>
            </svg>
          </span>
          {/* User Avatar Dropdown */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span className="cursor-pointer">
                  <Avatar className="h-[5vh] w-[2.5vw] min-w-[32px] min-h-[32px]">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                {user?.role === "admin" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => navigate("/admin")}>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Admin Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate("/admin/users")}>
                      <Users className="mr-2 h-4 w-4" />
                      <span>User Management</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => navigate("/admin/domains")}
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      <span>Domain Configuration</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => logout()}>
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
