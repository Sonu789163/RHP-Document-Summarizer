import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Mail,
  Shield,
  Edit,
  Loader2,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  workspaceInvitationService,
  WorkspaceInvitation,
} from "@/services/workspaceInvitationService";
import { getCurrentWorkspace } from "@/services/workspaceContext";

interface InviteeMember {
  email: string;
  name?: string;
  role: string;
  status: "accepted" | "pending";
  joinedAt?: string;
  invitedAt?: string;
}

export function InviteeManagement() {
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [currentWorkspace] = useState(() => getCurrentWorkspace());

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const data = await workspaceInvitationService.getWorkspaceInvitations();
      setInvitations(data);
    } catch (error) {
      console.error("Error loading invitations:", error);
      toast.error("Failed to load invitations");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (
    inviteeEmail: string,
    newRole: "user" | "viewer" | "editor"
  ) => {
    try {
      setUpdating(inviteeEmail);
      // Note: You may need to add an API endpoint to update user role
      // For now, we'll use the existing updateUserBuckets as a placeholder
      // You should implement a proper updateRole endpoint
      await workspaceInvitationService.updateUserBuckets(inviteeEmail, ["all"]);
      toast.success(`Updated access for ${inviteeEmail}`);
      loadInvitations();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast.error(
        error.response?.data?.message || "Failed to update access"
      );
    } finally {
      setUpdating(null);
    }
  };

  const handleRevokeAccess = async (invitationId: string, inviteeEmail: string) => {
    if (!window.confirm(`Revoke access for ${inviteeEmail}?`)) {
      return;
    }

    try {
      setUpdating(inviteeEmail);
      await workspaceInvitationService.revokeUserAccess(invitationId);
      toast.success(`Access revoked for ${inviteeEmail}`);
      loadInvitations();
    } catch (error: any) {
      console.error("Error revoking access:", error);
      toast.error(
        error.response?.data?.message || "Failed to revoke access"
      );
    } finally {
      setUpdating(null);
    }
  };

  // Group invitations by status
  const acceptedInvitations = invitations.filter(
    (inv) => inv.status === "accepted"
  );
  const pendingInvitations = invitations.filter(
    (inv) => inv.status === "pending"
  );

  if (loading) {
    return (
      <Card className="bg-white border-0 shadow-none">
        <CardHeader className="bg-white border-b border-gray-200">
          <CardTitle className="flex items-center gap-2 text-[#4B2A06]">
            <Users className="h-5 w-5" />
            Workspace Members
          </CardTitle>
        </CardHeader>
        <CardContent className="bg-white">
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
            <p className="text-sm text-gray-500 mt-2">Loading members...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-lg border-0 shadow-none">
      <CardHeader className="bg-white border-b border-gray-200">
        <CardTitle className="flex items-center gap-2 text-[#4B2A06]">
          <Users className="h-5 w-5" />
          Workspace Members & Invitations
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 bg-white">
        {/* Accepted Members */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="h-4 w-4 text-gray-600" />
            <h3 className="font-semibold text-[#4B2A06]">
              Active Members ({acceptedInvitations.length})
            </h3>
          </div>
          {acceptedInvitations.length === 0 ? (
            <div className="text-sm text-gray-500 py-4 text-center">
              No active members yet
            </div>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {acceptedInvitations.map((inv) => (
                <div
                  key={inv.invitationId}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm text-[#4B2A06] truncate">
                        {inv.inviteeEmail}
                      </div>
                      <div className="text-xs text-gray-500">
                        Invited: {new Date(inv.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-gray-100 text-gray-700 border-gray-200"
                    >
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <Select
                      value={inv.invitedRole}
                      onValueChange={(value: "user" | "viewer" | "editor") =>
                        handleUpdateRole(inv.inviteeEmail, value)
                      }
                      disabled={updating === inv.inviteeEmail}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeAccess(inv.invitationId, inv.inviteeEmail)}
                      disabled={updating === inv.inviteeEmail}
                      className="h-8 text-xs"
                    >
                      {updating === inv.inviteeEmail ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <UserX className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Invitations */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-4 w-4 text-gray-600" />
            <h3 className="font-semibold text-[#4B2A06]">
              Pending Invitations ({pendingInvitations.length})
            </h3>
          </div>
          {pendingInvitations.length === 0 ? (
            <div className="text-sm text-gray-500 py-4 text-center">
              No pending invitations
            </div>
          ) : (
            <div className="space-y-2 max-h-[30vh] overflow-y-auto">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.invitationId}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm text-[#4B2A06] truncate">
                        {inv.inviteeEmail}
                      </div>
                      <div className="text-xs text-gray-500">
                        Invited: {new Date(inv.createdAt).toLocaleDateString()}
                        {inv.expiresAt &&
                          new Date(inv.expiresAt) > new Date() && (
                            <> • Expires: {new Date(inv.expiresAt).toLocaleDateString()}</>
                          )}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-gray-100 text-gray-700 border-gray-200"
                    >
                      Pending
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <Select
                      value={inv.invitedRole}
                      disabled
                    >
                      <SelectTrigger className="w-28 h-8 text-xs opacity-60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

