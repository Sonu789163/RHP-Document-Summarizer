import React, { useEffect, useState, useRef } from "react";
import { Plus, Folder, Bell, ChevronDown, ChevronRight, Trash2, Edit2, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { directoryService, notificationsService } from "@/services/api";
import { toast } from "sonner";

type FolderItem = { id: string; name: string };

interface FolderSidebarProps {
  onFolderOpen?: (folder: FolderItem) => void;
  onFolderDeleted?: () => void;
  refreshNotifications?: boolean; // Add this to trigger refresh
}

export const FolderSidebar: React.FC<FolderSidebarProps> = ({ onFolderOpen, onFolderDeleted, refreshNotifications }) => {
  const navigate = useNavigate();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFolders, setShowFolders] = useState(true);
  const [creating, setCreating] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<FolderItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const createRef = useRef<HTMLDivElement | null>(null);
  const [renaming, setRenaming] = useState<FolderItem | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const loadRootFolders = async () => {
    try {
      setLoading(true);
      const data = await directoryService.listChildren("root");
      const onlyDirs = (data?.items || [])
        .filter((x: any) => x.kind === "directory")
        .map((x: any) => x.item) as FolderItem[];
      setFolders(onlyDirs);
    } catch (e: any) {
      toast.error("Failed to load folders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRootFolders();
    let active = true;
    const loadUnread = async () => {
      try {
        const res = await notificationsService.list({ unread: true, page: 1, pageSize: 1 });
        console.log('Unread notifications response:', res);
        if (active) {
          const count = res.total || 0;
          setUnreadCount(count);
          console.log('Set unread count to:', count);
        }
      } catch (error) {
        console.error('Failed to load unread count:', error);
        if (active) setUnreadCount(0);
      }
    };
    
    // Load immediately
    loadUnread();
    
    // Then load every 30 seconds (more frequent for testing)
    const id = setInterval(loadUnread, 30000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // Refresh notifications when refreshNotifications prop changes
  useEffect(() => {
    if (refreshNotifications) {
      const loadUnread = async () => {
        try {
          const res = await notificationsService.list({ unread: true, page: 1, pageSize: 1 });
          const count = res.total || 0;
          setUnreadCount(count);
          console.log('Refreshed unread count to:', count);
        } catch (error) {
          console.error('Failed to refresh unread count:', error);
        }
      };
      loadUnread();
    }
  }, [refreshNotifications]);

  useEffect(() => {
    const onDoc = (ev: MouseEvent) => {
      if (!showCreate) return;
      const el = createRef.current;
      if (el && !el.contains(ev.target as Node)) {
        setShowCreate(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showCreate]);

  const handleCreateFolder = async () => {
    if (!newName.trim()) {
      toast.error("Folder name is required");
      return;
    }
    try {
      setCreating(true);
      const created = await directoryService.create(newName.trim(), null);
      setNewName("");
      setShowCreate(false);
      await loadRootFolders();
      if (created?.id) {
        onFolderOpen?.({ id: created.id, name: created.name });
      }
      toast.success("Folder created");
    } catch (e: any) {
      if (e?.response?.status === 409) {
        toast.error("A folder with this name already exists");
      } else {
        toast.error("Failed to create folder");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!deleteConfirm) return;
    
    try {
      setDeleting(true);
      await directoryService.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      await loadRootFolders();
      onFolderDeleted?.();
      toast.success("Folder and all documents deleted");
    } catch (e: any) {
      toast.error("Failed to delete folder");
    } finally {
      setDeleting(false);
    }
  };

  const startRename = (folder: FolderItem) => {
    setRenaming(folder);
    setRenameValue(folder.name);
  };

  const cancelRename = () => {
    setRenaming(null);
    setRenameValue("");
  };

  const submitRename = async () => {
    if (!renaming) return;
    const newName = renameValue.trim();
    if (!newName || newName === renaming.name) {
      cancelRename();
      return;
    }
    try {
      await directoryService.update(renaming.id, { name: newName });
      toast.success("Folder renamed");
      await loadRootFolders();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Failed to rename folder");
    } finally {
      cancelRename();
    }
  };

  return (
    <aside className="hidden md:flex md:flex-col md:w-[260px] shrink-0 border-r border-gray-200 bg-white">
      <div className="p-4 relative">
        <button  onClick={() => setShowCreate((v) => !v)}
            aria-label="Create folder" className="flex items-center justify-between w-full  rounded-xl px-4 py-3 bg-[#ECE9E2] text-[#4B2A06] font-semibold">
          <span>New Folder</span>
          
            <Plus className="h-5 w-5" />
        
        </button>
        {showCreate && (
          <div ref={createRef} className="absolute left-4 right-4 mt-2 bg-white border border-gray-200 rounded-lg shadow p-3 z-10">
            <label className="block text-xs text-gray-600 mb-1">Folder name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }}
              className="w-full border rounded px-2 py-1 text-sm mb-2"
              placeholder="e.g. Contracts"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button className="text-sm px-3 py-1 rounded border" onClick={() => { setShowCreate(false); setNewName(""); }}>Cancel</button>
              <button className="text-sm px-3 py-1 rounded bg-[#4B2A06] text-white disabled:opacity-50" disabled={creating} onClick={handleCreateFolder}>
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        )}
      </div>

      <nav className="px-4 space-y-2">
        <button
          className="w-full flex items-center gap-3 px-5 justify-between text-sm text-gray-800 hover:text-[#4B2A06]"
          onClick={() => setShowFolders((v) => !v)}
        >
          
          <div className="flex items-center gap-2">
          <Folder className="h-5 w-5" />
          Folders
          </div>
          <div className="flex items-center  gap-2">
          
          {showFolders ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          </div>
        </button>
        {showFolders && (
          <div className="pl-7 pr-2 h-[75vh] overflow-y-auto ">
            {loading ? (
              <div className="text-xs text-gray-500 py-2">Loading...</div>
            ) : folders.length === 0 ? (
              <div className="text-xs text-gray-500 py-2">No folders yet</div>
            ) : (
              <ul className="space-y-1 scrollbar-hide">
                {folders.map((f) => (
                  <li key={f.id} className="group">
                    <div className="flex items-center gap-2">
                      {renaming?.id === f.id ? (
                        <>
                          <input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitRename();
                              if (e.key === 'Escape') cancelRename();
                            }}
                            className="flex-1 px-2 py-1 text-sm border rounded"
                            autoFocus
                          />
                          <button className="text-green-700 hover:text-green-800" title="Save" onClick={submitRename}>
                            <Check className="h-4 w-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-800" title="Cancel" onClick={cancelRename}>
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="flex-1 flex items-center justify-between text-left px-4 py-2 text-sm text-gray-700 hover:text-[#4B2A06] hover:bg-[#ECE9E2] rounded-md truncate"
                            title={f.name}
                            onClick={() => onFolderOpen?.(f)}
                          >
                            {f.name}
                            <div className="flex items-center gap-2">
                            <button
                            className="opacity-0 group-hover:opacity-100 text-[#5A6473] hover:text-blue-600 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); startRename(f); }}
                            title="Rename folder"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            className="opacity-0 group-hover:opacity-100  text-[#5A6473] hover:text-red-600 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(f);
                            }}
                            title="Delete folder"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                            </div>
                          </button>
                          
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

      </nav>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Folder</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete the folder <strong>"{deleteConfirm.name}"</strong>? 
              All documents in this folder will also be deleted and this action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                onClick={handleDeleteFolder}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};


