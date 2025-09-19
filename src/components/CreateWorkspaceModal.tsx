import React, { useState } from "react";
import { toast } from "sonner";
import { workspaceService } from "@/services/workspaceService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreateWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateWorkspaceModal({
  open,
  onOpenChange,
  onCreated,
}: CreateWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const toSlug = (v: string) =>
    (v || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const submit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Workspace name is required");
      return;
    }
    try {
      setBusy(true);
      const payload = { name: trimmed, slug: slug ? toSlug(slug) : undefined };
      await workspaceService.createWorkspace(payload);
      toast.success("Workspace created");
      setName("");
      setSlug("");
      setDesc("");
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to create workspace");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#4B2A06]">Create Workspace</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-[#4B2A06]">Workspace name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Team Alpha"
              className="bg-white border-gray-300 text-[#4B2A06] focus:border-[#E5E5E5] focus:ring-0"
            />
          </div>
          <div>
            <Label className="text-[#4B2A06]">Workspace URL (optional)</Label>
            <div className="flex">
              <span className="px-3 py-2 bg-gray-100 border rounded-l text-sm text-[#4B2A06]">
                /
              </span>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="team-alpha"
                className="rounded-l-none bg-white border-gray-300 text-[#4B2A06] focus:border-[#E5E5E5] focus:ring-0"
              />
            </div>
          </div>
          <div>
            <Label className="text-[#4B2A06]">Description (optional)</Label>
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe this workspace"
              rows={3}
              className="bg-white border-gray-300 text-[#4B2A06] focus:border-[#E5E5E5] focus:ring-0"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-white text-[#4B2A06] border-gray-300 hover:bg-gray-50 hover:text-[#4B2A06]"
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={busy}
              className="bg-[#4B2A06] text-white hover:bg-[#3A2004] disabled:bg-gray-400"
            >
              {busy ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateWorkspaceModal;
