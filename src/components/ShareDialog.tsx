import React, { useEffect, useState } from "react";
import { shareService } from "@/services/api";
import { X, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type ResourceType = "directory" | "document";

interface ShareDialogProps {
  resourceType: ResourceType;
  resourceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ resourceType, resourceId, open, onOpenChange }) => {
  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState<any[]>([]);
  const [role, setRole] = useState<"viewer" | "editor" | "owner">("viewer");
  const [scope, setScope] = useState<"user" | "workspace" | "link">("user");
  const [principalId, setPrincipalId] = useState("");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";

  const load = async () => {
    if (!resourceId) return;
    setLoading(true);
    try {
      const res = await shareService.list(resourceType, resourceId);
      setShares(res || []);
    } catch (e) {
      toast.error("Failed to load shares");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open, resourceId]);

  // Non-admins can only assign viewer role
  useEffect(() => {
    if (!isAdmin && role !== "viewer") {
      setRole("viewer");
    }
  }, [isAdmin, role]);

  const addShare = async () => {
    if (!resourceId) return;
    try {
      await shareService.create({ resourceType, resourceId, scope, role, principalId: scope === "link" ? undefined : principalId });
      setPrincipalId("");
      await load();
      toast.success("Share added");
    } catch (e) {
      toast.error("Failed to add share");
    }
  };

  const revoke = async (id: string) => {
    try {
      await shareService.revoke(id);
      await load();
      toast.success("Share revoked");
    } catch (e) {
      toast.error("Failed to revoke share");
    }
  };

  const createLink = async () => {
    if (!resourceId) return;
    try {
      const { token } = await shareService.createOrRotateLink(resourceType, resourceId, role === "owner" ? "editor" : role);
      setLinkToken(token);
      await load();
      toast.success("Link created");
    } catch (e) {
      toast.error("Failed to create link");
    }
  };

  const copyLink = async () => {
    if (!linkToken) return;
    const url = `${window.location.origin}/dashboard?linkToken=${encodeURIComponent(linkToken)}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{borderRadius: 16}}>
        {/* Header */}
        <div className=" px-6 py-4 flex items-center justify-between">
        <div className="text-lg font-extrabold item-right text-[#232323]">Share</div>
          <button onClick={() => onOpenChange(false)} className="text-gray-500 hover:text-gray-700   ">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="h-px bg-[#EFEAE4]" />
        {/* Body */}
        <div className="px-6 py-5 text-center flex flex-col items-center">
          <div className="text-sm text-[#232323] mb-3 font-semibold">General access</div>
          <div className="flex  items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-[#F5F3EF] border border-[#E8E2DA]">
              <span className="text-[#4B2A06]">🔒</span>
            </div>
            <div className="flex items-center  gap-2 relative">
              <select
                value={scope === 'link' ? 'link' : 'restricted'}
                onChange={(e) => setScope(e.target.value === 'link' ? 'link' : 'user')}
                className="h-10 pl-3 pr-10 appearance-none rounded-lg bg-[#F5F3EF] border border-[#E8E2DA] text-[#232323] text-sm"
              >
                <option  value="restricted">Restricted</option>
                <option value="link">Anyone with link</option>
              </select>
              <span className="pointer-events-none absolute right-3 text-[#7C7C7C]">▾</span>
            </div>
            {/* Role selector */}
            <div className="flex items-center gap-2 relative ">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="h-10 pl-3 pr-10 appearance-none rounded-lg bg-[#F5F3EF] border border-[#E8E2DA] text-[#232323] text-sm "
                disabled={!isAdmin || scope !== 'link'}
                title="Access level for link viewers"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                {isAdmin && <option value="owner">Owner</option>}
              </select>
              <span className="pointer-events-none absolute right-3 text-[#7C7C7C]">▾</span>
            </div>
          </div>

          {/* Link actions */}
          <div className="mt-6 flex justify-center gap-2 w-full">
            <button
              onClick={createLink}
              className="inline-flex items-center gap-2 bg-[#4B2A06] text-white px-4 py-2 rounded-md hover:bg-[#3A2004] disabled:opacity-50"
              disabled={scope !== 'link'}
              title={scope !== 'link' ? 'Switch to "Anyone with link" first' : 'Create share link'}
            >
              Create link
            </button>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-2 bg-[#4B2A06] text-white px-4 py-2 rounded-md hover:bg-[#3A2004] disabled:opacity-50"
              disabled={!linkToken}
              title={!linkToken ? 'Create a link first' : 'Copy link to clipboard'}
            >
              <Copy className="h-4 w-4" /> Copy link
            </button>
          </div>

          {/* Existing shares (collapsed style) */}
          <div className="mt-6 w-full">
            <div className="text-sm font-semibold mb-2 text-[#232323]">People with access</div>
            <div className="space-y-2 max-h-48 overflow-y-auto w-full">
              {loading ? (
                <div className="text-gray-500 text-sm">Loading...</div>
              ) : shares.length === 0 ? (
                <div className="text-gray-500 text-sm">No shares yet</div>
              ) : (
                shares.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg bg-[#F9F6F2] px-3 py-2">
                    <div className="text-sm text-[#232323]">
                      <div className="font-medium">
                        {s.scope === 'link' ? 'Link' : s.scope === 'workspace' ? `Workspace: ${s.principalId}` : `User: ${s.principalId}`}
                      </div>
                      <div className="text-xs text-[#7C7C7C]">Role: {s.role}</div>
                    </div>
                    <button className="text-red-600 hover:text-red-700" onClick={() => revoke(s.id)} title="Revoke">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



