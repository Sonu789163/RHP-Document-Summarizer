import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { UserPlus, Mail, Loader2 } from "lucide-react";
import {
  workspaceInvitationService,
  SendInvitationData,
} from "@/services/workspaceInvitationService";
import { directoryService } from "@/services/api";

interface InviteWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceName: string;
  onInviteSent?: () => void;
}

export function InviteWorkspaceDialog({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
  onInviteSent,
}: InviteWorkspaceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [directories, setDirectories] = useState<any[]>([]);
  const [dirLoading, setDirLoading] = useState(false);
  const [dirSearch, setDirSearch] = useState("");
  const [selectedDirectories, setSelectedDirectories] = useState<any[]>([]);

  const [formData, setFormData] = useState<SendInvitationData>({
    inviteeEmail: "",
    inviteeName: "",
    invitedRole: "user",
    message: "",
    allowedTimeBuckets: ["all"],
    grantedDirectories: [],
  });

  useEffect(() => {
    if (open) {
      loadDirectories();
    }
  }, [open]);

  const loadDirectories = async () => {
    try {
      setDirLoading(true);
      const res = await directoryService.listChildren("root", {
        pageSize: 200,
        sort: "name",
        order: "asc",
      });
      
      const allItems = res?.items || [];
      const dirs = allItems
        .filter((item: any) => item.kind === "directory")
        .map((item: any) => item.item);
      
      setDirectories(dirs);
    } catch (error) {
      console.error("Error loading directories:", error);
      toast.error("Failed to load directories");
    } finally {
      setDirLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.inviteeEmail || !formData.inviteeName) {
      toast.error("Email and name are required");
      return;
    }

    if (selectedDirectories.length === 0) {
      toast.error("Please select at least one directory");
      return;
    }

    try {
      setLoading(true);
      await workspaceInvitationService.sendInvitation({
        ...formData,
        grantedDirectories: selectedDirectories.map((dir) => ({
          directoryId: dir.id,
          role: "viewer", // Default role, can be customized
        })),
      });

      toast.success(`Invitation sent to ${formData.inviteeEmail}`);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        inviteeEmail: "",
        inviteeName: "",
        invitedRole: "user",
        message: "",
        allowedTimeBuckets: ["all"],
        grantedDirectories: [],
      });
      setSelectedDirectories([]);
      setDirSearch("");
      
      onInviteSent?.();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(
        error.response?.data?.message || "Failed to send invitation"
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredDirectories = directories.filter((dir) =>
    dir.name.toLowerCase().includes(dirSearch.toLowerCase())
  );

  const toggleDirectory = (directory: any) => {
    setSelectedDirectories((prev) => {
      const exists = prev.find((d) => d.id === directory.id);
      if (exists) {
        return prev.filter((d) => d.id !== directory.id);
      } else {
        return [...prev, directory];
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite to {workspaceName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={formData.inviteeEmail}
              onChange={(e) =>
                setFormData({ ...formData, inviteeEmail: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              type="text"
              placeholder="User Name"
              value={formData.inviteeName}
              onChange={(e) =>
                setFormData({ ...formData, inviteeName: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.invitedRole}
              onValueChange={(value: "user" | "viewer" | "editor") =>
                setFormData({ ...formData, invitedRole: value })
              }
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to your invitation..."
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Select Directories to Grant Access *</Label>
            <Input
              placeholder="Search directories..."
              value={dirSearch}
              onChange={(e) => setDirSearch(e.target.value)}
              className="mb-2"
            />
            <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
              {dirLoading ? (
                <div className="text-sm text-gray-500 py-4 text-center">
                  Loading directories...
                </div>
              ) : filteredDirectories.length === 0 ? (
                <div className="text-sm text-gray-500 py-4 text-center">
                  No directories found
                </div>
              ) : (
                filteredDirectories.map((dir) => {
                  const isSelected = selectedDirectories.some(
                    (d) => d.id === dir.id
                  );
                  return (
                    <div
                      key={dir.id}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      onClick={() => toggleDirectory(dir)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDirectory(dir)}
                        className="rounded"
                      />
                      <span className="text-sm flex-1">{dir.name}</span>
                    </div>
                  );
                })
              )}
            </div>
            {selectedDirectories.length > 0 && (
              <div className="text-xs text-gray-600 mt-2">
                {selectedDirectories.length} director
                {selectedDirectories.length !== 1 ? "ies" : "y"} selected
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

