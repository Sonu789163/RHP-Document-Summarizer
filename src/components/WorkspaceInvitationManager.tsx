import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  workspaceInvitationService,
  WorkspaceInvitation,
  SendInvitationData,
} from "../services/workspaceInvitationService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  UserPlus,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import { shareService, directoryService } from "@/services/api";

interface WorkspaceInvitationManagerProps {
  className?: string;
}

export function WorkspaceInvitationManager({
  className,
}: WorkspaceInvitationManagerProps) {
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [invitationData, setInvitationData] = useState<SendInvitationData>({
    inviteeEmail: "",
    inviteeName: "",
    invitedRole: "user",
    message: "",
    allowedTimeBuckets: ["today"],
  });

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

  const handleSendInvitation = async () => {
    if (!invitationData.inviteeEmail) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      setSending(true);
      await workspaceInvitationService.sendInvitation(invitationData);
      toast.success("Invitation sent successfully");
      setIsDialogOpen(false);
      setInvitationData({
        inviteeEmail: "",
        inviteeName: "",
        invitedRole: "user",
        message: "",
      });
      loadInvitations();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(error.response?.data?.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await workspaceInvitationService.cancelInvitation(invitationId);
      toast.success("Invitation cancelled");
      loadInvitations();
    } catch (error: any) {
      console.error("Error cancelling invitation:", error);
      toast.error(
        error.response?.data?.message || "Failed to cancel invitation"
      );
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-gray-100 text-gray-700 border-gray-200", icon: Clock },
      accepted: { color: "bg-gray-100 text-gray-700 border-gray-200", icon: CheckCircle },
      declined: { color: "bg-gray-100 text-gray-700 border-gray-200", icon: XCircle },
      expired: { color: "bg-gray-100 text-gray-700 border-gray-200", icon: Clock },
      cancelled: { color: "bg-gray-100 text-gray-700 border-gray-200", icon: XCircle },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className={className}>
      <Card className="bg-white border-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between rounded-lg bg-white border-b border-gray-200">
          <CardTitle className="flex items-center gap-2 text-[#4B2A06]">
            <UserPlus className="h-5 w-5" />
            Workspace Invitations
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#4B2A06] text-white shadow-md hover:bg-[#3A2004] transition">
                <Mail className="h-4 w-4 mr-2" />
                Send Invitation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Send Workspace Invitation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email Address *</label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={invitationData.inviteeEmail}
                    onChange={(e) =>
                      setInvitationData({
                        ...invitationData,
                        inviteeEmail: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Name (Optional)</label>
                  <Input
                    placeholder="John Doe"
                    value={invitationData.inviteeName}
                    onChange={(e) =>
                      setInvitationData({
                        ...invitationData,
                        inviteeName: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <Select
                    value={invitationData.invitedRole}
                    onValueChange={(value: "user" | "viewer" | "editor") =>
                      setInvitationData({
                        ...invitationData,
                        invitedRole: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">
                        User - Can create and manage content
                      </SelectItem>
                      <SelectItem value="editor">
                        Editor - Can edit and manage content
                      </SelectItem>
                      <SelectItem value="viewer">
                        Viewer - Can only view content
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Allowed Time Buckets
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {(
                      [
                        { key: "today", label: "Today" },
                        { key: "last7", label: "Last 7 days" },
                        { key: "last15", label: "Last 15 days" },
                        { key: "last30", label: "Last 30 days" },
                        { key: "last90", label: "Last 3 months" },
                        { key: "all", label: "All" },
                      ] as { key: any; label: string }[]
                    ).map((opt) => {
                      const checked =
                        invitationData.allowedTimeBuckets?.includes(opt.key);
                      return (
                        <label
                          key={opt.key}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={!!checked}
                            onChange={(e) => {
                              const prev = new Set(
                                invitationData.allowedTimeBuckets || []
                              );
                              if (e.target.checked) {
                                if (opt.key === "all") {
                                  setInvitationData({
                                    ...invitationData,
                                    allowedTimeBuckets: ["all"],
                                  });
                                } else {
                                  prev.add(opt.key);
                                  prev.delete("all");
                                  setInvitationData({
                                    ...invitationData,
                                    allowedTimeBuckets: Array.from(prev),
                                  });
                                }
                              } else {
                                prev.delete(opt.key);
                                setInvitationData({
                                  ...invitationData,
                                  allowedTimeBuckets: Array.from(prev),
                                });
                              }
                            }}
                          />
                          {opt.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Message (Optional)
                  </label>
                  <Textarea
                    placeholder="Welcome to our workspace! We're excited to have you join us."
                    value={invitationData.message}
                    onChange={(e) =>
                      setInvitationData({
                        ...invitationData,
                        message: e.target.value,
                      })
                    }
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSendInvitation} disabled={sending}>
                    {sending ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="bg-white">
          {loading ? (
            <div className="text-center py-4 text-gray-600">Loading invitations...</div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600">No invitations sent yet</p>
              <p className="text-sm text-gray-500">
                Send your first invitation to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-white border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">
                        {invitation.inviterName || invitation.inviterEmail}
                      </h3>
                      {getStatusBadge(invitation.status)}
                      <Badge variant="outline">{invitation.invitedRole}</Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <strong>Email:</strong> {invitation.inviterEmail}
                      </p>
                      <p>
                        <strong>Workspace:</strong> {invitation.workspaceName}
                      </p>
                      <p>
                        <strong>Sent:</strong>{" "}
                        {formatDate(invitation.createdAt)}
                      </p>
                      <p>
                        <strong>Expires:</strong>{" "}
                        {formatDate(invitation.expiresAt)}
                        {isExpired(invitation.expiresAt) && (
                          <span className="text-red-600 ml-1">(Expired)</span>
                        )}
                      </p>
                      {invitation.message && (
                        <p>
                          <strong>Message:</strong> {invitation.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {invitation.status === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleCancelInvitation(invitation.invitationId)
                          }
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <DeleteInviteButton
                          invitationId={invitation.invitationId}
                          reload={loadInvitations}
                        />
                      </>
                    )}
                    {invitation.status === "cancelled" && (
                      <DeleteInviteButton
                        invitationId={invitation.invitationId}
                        reload={loadInvitations}
                      />
                    )}
                    {invitation.status === "accepted" && (
                      <PerUserAccessEditor invite={invitation} />
                    )}
                    {/* Always show delete button for any status */}
                    {invitation.status !== "pending" &&
                      invitation.status !== "cancelled" && (
                        <DeleteInviteButton
                          invitationId={invitation.invitationId}
                          reload={loadInvitations}
                        />
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PerUserAccessEditor({ invite }: { invite: WorkspaceInvitation }) {
  const [saving, setSaving] = useState(false);
  const [bucket, setBucket] = useState<
    "today" | "last7" | "last15" | "last30" | "last90" | "all"
  >("today");
  const [dirId, setDirId] = useState("");
  const [dirRole, setDirRole] = useState<"viewer" | "editor">("viewer");
  const [creatingLink, setCreatingLink] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [shares, setShares] = useState<any[]>([]);
  const [dirSearch, setDirSearch] = useState("");
  const [directories, setDirectories] = useState<any[]>([]);
  const [dirLoading, setDirLoading] = useState(false);
  const [selectedDirs, setSelectedDirs] = useState<any[]>([]);

  useEffect(() => {
    const loadRootDirs = async () => {
      try {
        setDirLoading(true);
        // Load root children by passing "root" as id
        const res = await directoryService.listChildren("root", { pageSize: 200, sort: "name", order: "asc" });
        setDirectories(Array.isArray(res?.items) ? res.items : res);
      } catch (e) {
        // ignore
      } finally {
        setDirLoading(false);
      }
    };
    loadRootDirs();
  }, []);

  const update = async () => {
    try {
      setSaving(true);
      await workspaceInvitationService.updateUserBuckets(invite.inviterEmail, [
        bucket,
      ]);
      toast.success("Access window updated");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const createDirectoryLink = async () => {
    const targetDirs = selectedDirs.length > 0 ? selectedDirs : (dirId ? [{ id: dirId }] : []);
    if (targetDirs.length === 0) {
      toast.error("Select at least one directory");
      return;
    }
    try {
      setCreatingLink(true);
      let lastToken: string | null = null;
      for (const d of targetDirs) {
        const { token } = await shareService.createOrRotateLink("directory", d.id, dirRole);
        lastToken = token;
      }
      setCreatedToken(lastToken);
      toast.success(`Access created for ${targetDirs.length} director${targetDirs.length > 1 ? 'ies' : 'y'}`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to create access");
    } finally {
      setCreatingLink(false);
    }
  };

  const copyCreatedLink = async () => {
    if (!createdToken) return;
    const url = `${window.location.origin}/dashboard?linkToken=${encodeURIComponent(
      createdToken
    )}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  const loadDirectoryShares = async () => {
    if (!dirId) {
      toast.error("Enter a directory ID");
      return;
    }
    try {
      setSharesLoading(true);
      const res = await shareService.list("directory", dirId);
      setShares(res || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to load shares");
    } finally {
      setSharesLoading(false);
    }
  };

  const revokeShare = async (id: string) => {
    try {
      await shareService.revoke(id);
      toast.success("Access revoked");
      loadDirectoryShares();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to revoke");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Select value={bucket} onValueChange={(v: any) => setBucket(v)}>
          <SelectTrigger className="w-[160px] bg-white text-[#4B2A06] border-gray-300">
            <SelectValue placeholder="Today" />
          </SelectTrigger>
          <SelectContent className="bg-white text-[#4B2A06] border-gray-200">
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="last7">Last 7 days</SelectItem>
            <SelectItem value="last15">Last 15 days</SelectItem>
            <SelectItem value="last30">Last 30 days</SelectItem>
            <SelectItem value="last90">Last 3 months</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="bg-[#4B2A06] text-white hover:bg-[#3A2004] transition" onClick={update} disabled={saving}>
          {saving ? "Saving..." : "Update"}
        </Button>
      </div>

      <div className="rounded-md border border-gray-200 p-2 bg-white">
        <div className="text-xs font-semibold mb-2 text-[#4B2A06]">Directory Access</div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search directories..."
            value={dirSearch}
            onChange={(e) => setDirSearch(e.target.value)}
            className="h-8 w-60 bg-white"
          />
          <Select value={dirRole} onValueChange={(v: any) => setDirRole(v)}>
            <SelectTrigger className="w-28 h-8 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200">
              <SelectItem value="viewer">Viewer</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={createDirectoryLink} disabled={creatingLink || (selectedDirs.length === 0 && !dirId)}>
            {creatingLink ? "Granting..." : "Grant Access"}
          </Button>
          <Button size="sm" variant="outline" onClick={copyCreatedLink} disabled={!createdToken}>
            Copy Last Link
          </Button>
          <Button size="sm" variant="outline" onClick={loadDirectoryShares}>
            {sharesLoading ? "Loading..." : "Load Shares"}
          </Button>
        </div>

        {/* Directory list with multi-select */}
        <div className="mt-2 max-h-44 overflow-y-auto border rounded">
          {dirLoading ? (
            <div className="text-xs text-gray-500 p-2">Loading directories...</div>
          ) : (
            (directories || [])
              .filter((d: any) =>
                dirSearch ? (d.name || "").toLowerCase().includes(dirSearch.toLowerCase()) : true
              )
              .map((d: any) => {
                const checked = selectedDirs.some((s) => s.id === d.id);
                return (
                  <label key={d.id} className="flex items-center gap-2 text-sm px-2 py-1 border-b last:border-b-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDirs((prev) => [...prev, { id: d.id, name: d.name }]);
                        } else {
                          setSelectedDirs((prev) => prev.filter((x) => x.id !== d.id));
                        }
                      }}
                    />
                    <span className="truncate">{d.name} <span className="text-[10px] text-gray-500">({d.id})</span></span>
                  </label>
                );
              })
          )}
        </div>

        {shares.length > 0 && (
          <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
            {shares.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1">
                <div>
                  <div className="font-medium">{s.resourceName || s.scope === 'link' ? 'Directory link' : s.scope}</div>
                  <div className="text-gray-600">Role: {s.role}</div>
                </div>
                <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => revokeShare(s.id)}>
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DeleteInviteButton({
  invitationId,
  reload,
}: {
  invitationId: string;
  reload: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={async () => {
        try {
          setBusy(true);
          await workspaceInvitationService.deleteInvitation(invitationId);
          toast.success("Invitation deleted");
          reload();
        } catch (e: any) {
          toast.error(e.response?.data?.message || "Failed to delete");
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
    >
      {busy ? "Deleting..." : "Delete"}
    </Button>
  );
}
