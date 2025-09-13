// src/pages/DrivePage.jsx
import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  ArrowLeftIcon,
  FolderIcon,
  DocumentIcon,
  PhotoIcon,
  ArrowDownTrayIcon,
  EllipsisVerticalIcon,
  PlusIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/solid";
import { apiGet, apiPostForm, apiPostJson, apiDelete, apiPatch } from "../lib/api";

/* Helpers (unchanged) */
function fileIconByType(file) {
  const type = (file.mimeType || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  if (type.startsWith("image/") || name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return "image";
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (type.startsWith("video/") || name.match(/\.(mp4|mov|webm|mkv)$/)) return "video";
  if (type.startsWith("audio/") || name.match(/\.(mp3|wav|ogg)$/)) return "audio";
  return "doc";
}
function humanFileSize(bytes) {
  if (bytes === 0) return "0 B";
  if (!bytes && bytes !== 0) return "";
  const thresh = 1024;
  if (Math.abs(bytes) < thresh) return bytes + " B";
  const units = ["KB", "MB", "GB", "TB"];
  let u = -1;
  do {
    bytes /= thresh;
    ++u;
  } while (Math.abs(bytes) >= thresh && u < units.length - 1);
  return bytes.toFixed(1) + " " + units[u];
}

export default function DrivePage() {
  // server content
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  // selectedFolderId: null = root
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  // breadcrumb: array of { _id, name } from root -> current
  const [breadcrumb, setBreadcrumb] = useState([{ _id: null, name: "My Drive" }]);

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const folderInputRef = useRef(null);

  const [previewItem, setPreviewItem] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRefs = useRef(new Map());
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const q = (params.get("q") || "").trim().toLowerCase();

  useEffect(() => {
    fetchFolderContents(selectedFolderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolderId]);

  // load ancestors if direct link to subfolder
  useEffect(() => {
    async function loadAncestors() {
      if (selectedFolderId && breadcrumb.length === 1) {
        try {
          const res = await apiGet(`/api/folders/ancestors/${selectedFolderId}`);
          const ancestors = res.ancestors || [];
          setBreadcrumb([{ _id: null, name: "My Drive" }, ...ancestors]);
        } catch (err) {
          // ignore — breadcrumb will be built by clicks
        }
      }
    }
    loadAncestors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolderId]);

  useEffect(() => {
    function onDocClick(e) {
      if (!menuOpenId) return;
      const ref = menuRefs.current.get(menuOpenId);
      if (!ref || !ref.contains(e.target)) setMenuOpenId(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpenId]);

  // ---------- Backend calls ----------
  async function fetchFolderContents(folderId) {
    try {
      setLoading(true);
      const parentParam = folderId ? folderId : "null";
      const foldersRes = await apiGet(`/api/folders?parent=${parentParam}`);
      const filesRes = await apiGet(`/api/files?folder=${parentParam}`);
      setFolders(foldersRes.folders || []);
      setFiles(filesRes.files || []);
    } catch (err) {
      console.error("Fetch contents error:", err);
      alert(err.body?.error || err.message || "Failed to load contents");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateFolder() {
    const name = (newFolderName || "").trim();
    if (!name) return;
    try {
      setLoading(true);
      const parent = selectedFolderId || null;
      const res = await apiPostJson("/api/folders", { name, parent });
      const folder = res.folder;
      setFolders((p) => [...p, folder]);
      setNewFolderName("");
      setCreatingFolder(false);
    } catch (err) {
      console.error("Create folder error:", err);
      alert(err.body?.error || err.message || "Create folder failed");
    } finally {
      setLoading(false);
    }
  }

  // upload -> cloudinary via backend
  const handleUpload = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    const parent = selectedFolderId || "";
    try {
      for (const file of selected) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", parent);
        const res = await apiPostForm("/api/files", fd);
        const fileDoc = res.file;
        setFiles((p) => [fileDoc, ...p]);
      }
      e.target.value = "";
    } catch (err) {
      console.error("Upload error:", err);
      alert(err.body?.error || err.message || "Upload failed");
    }
  };

  // OPEN folder (called from clicking a folder card).
  const openFolder = (folder) => {
    const id = folder?._id || folder?.id;
    if (!id) return;
    setSelectedFolderId(id);
    setBreadcrumb((b) => [...b, { _id: id, name: folder.name }]);
  };

  // go back one step (breadcrumb)
  const goBack = () => {
    if (breadcrumb.length <= 1) {
      setSelectedFolderId(null);
      return;
    }
    const newPath = breadcrumb.slice(0, -1);
    setBreadcrumb(newPath);
    const prev = newPath[newPath.length - 1];
    setSelectedFolderId(prev._id);
  };

  // go to a specific breadcrumb index (click on segment)
  const goToBreadcrumb = (index) => {
    const newPath = breadcrumb.slice(0, index + 1);
    setBreadcrumb(newPath);
    const sel = newPath[newPath.length - 1];
    setSelectedFolderId(sel._id);
  };

  // delete file by db id
  async function handleDeleteFile(item) {
    const id = item?._id || item?.id;
    if (!id) return;
    if (!confirm("Delete this file?")) return;
    try {
      await apiDelete(`/api/files/${id}`);
      setFiles((p) => p.filter((f) => (f._id || f.id) !== id));
      setMenuOpenId(null);
    } catch (err) {
      console.error("Delete file error:", err);
      alert(err.body?.error || err.message || "Delete failed");
    }
  }

  // delete folder
  async function handleDeleteFolder(id) {
    if (!confirm("Delete this folder and its contents?")) return;
    try {
      await apiDelete(`/api/folders/${id}`);
      setFolders((p) => p.filter((f) => f._id !== id));
      setFiles((p) => p.filter((file) => file.folder !== id));
      setMenuOpenId(null);
      if (selectedFolderId === id) {
        setSelectedFolderId(null);
        setBreadcrumb([{ _id: null, name: "My Drive" }]);
      }
    } catch (err) {
      console.error("Delete folder error:", err);
      alert(err.body?.error || err.message || "Delete folder failed");
    }
  }

  // download via server proxy (so token works)
  async function downloadFileById(item) {
    try {
      const id = item?._id || item?.id;
      if (!id) return alert("Invalid file id for download");
      const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/files/download/${id}`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Download failed: ${res.status}`);
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = item.name || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
      setMenuOpenId(null);
    } catch (err) {
      console.error("Download failed:", err);
      alert(err.message || "Download failed");
    }
  }

  // rename folder (persist)
  async function handleRenameFolder(item) {
    const id = item._id || item.id;
    const newName = prompt("Rename folder", item.name);
    if (!newName || !newName.trim()) return;
    try {
      const res = await apiPatch(`/api/folders/${id}`, { name: newName.trim() });
      const updated = res.folder || res;
      setFolders((p) => p.map((f) => (f._id === id ? updated : f)));
      setBreadcrumb((b) => b.map((seg) => (seg._id === id ? { ...seg, name: updated.name } : seg)));
      setMenuOpenId(null);
    } catch (err) {
      console.error("Rename folder error:", err);
      alert(err.body?.error || err.message || "Rename failed");
    }
  }

  // combined items
  const folderItems = folders.filter((f) => (f.parent ? f.parent : null) === (selectedFolderId || null));
  const fileItems = files.filter((f) => (f.folder ? f.folder : null) === (selectedFolderId || null));
  const combined = [
    ...folderItems.map((f) => ({ ...f, _type: "folder", id: f._id })),
    ...fileItems.map((f) => ({ ...f, _type: "file", id: f._id })),
  ];

  const filtered = combined.filter((item) => {
    if (!q) return true;
    return (item.name || "").toLowerCase().includes(q);
  });

  const isImageItem = (item) => fileIconByType(item) === "image";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with breadcrumb */}
      <div className="flex items-center justify-between p-4 bg-white shadow">
        <div className="flex items-center gap-3">
          {breadcrumb.length > 1 ? (
            <button onClick={goBack} className="p-2 rounded-md hover:bg-gray-100 cursor-pointer" title="Back">
              <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
            </button>
          ) : (
            <div className="w-8" />
          )}

          <div className="flex items-center gap-3">
            <FolderIcon className="h-8 w-8 text-yellow-500" />
            <nav className="flex items-center gap-2 text-sm sm:text-base flex-wrap">
              {breadcrumb.map((seg, idx) => (
                <span key={String(seg._id) + "-" + idx} className="flex items-center gap-2">
                  {idx > 0 && <span className="text-gray-300">›</span>}
                  <button
                    onClick={() => goToBreadcrumb(idx)}
                    className={`text-left ${idx === breadcrumb.length - 1 ? "font-semibold" : "text-gray-600 hover:underline"}`}
                  >
                    {seg.name}
                  </button>
                </span>
              ))}
            </nav>
          </div>
        </div>

        {/* Actions - responsive */}
        <div className="flex items-center gap-2">
          {/* On small screens show compact icon buttons; on larger show full text buttons */}
          <div className="flex gap-2 items-center">
            {/* Create folder */}
            <button
              onClick={() => { setCreatingFolder(true); setTimeout(() => folderInputRef.current?.focus(), 50); }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 focus:outline-none"
              aria-label="Create folder"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Create Folder</span>
            </button>

            {/* Upload */}
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-green-600 text-white text-sm hover:bg-green-700 cursor-pointer">
              <ArrowUpTrayIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Upload</span>
              <input type="file" multiple onChange={handleUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {loading && <div className="text-sm text-gray-500 mb-3">Loading...</div>}

        {/* Create folder inline input */}
        {creatingFolder && (
          <div className="mb-4 flex gap-2 items-center">
            <input
              ref={folderInputRef}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName(""); }
              }}
            />
            <button onClick={handleCreateFolder} className="px-3 py-2 bg-green-600 text-white rounded-md">Add</button>
            <button onClick={() => { setCreatingFolder(false); setNewFolderName(""); }} className="px-3 py-2 bg-gray-200 rounded-md">Cancel</button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-20">No items here yet</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filtered.map((item) => {
  if (item._type === "folder") {
    return (
      <div
        key={item.id}
        className="relative bg-white border rounded-lg shadow-sm p-4 hover:bg-indigo-50 cursor-pointer overflow-visible"
        onClick={() => openFolder(item)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') openFolder(item); }}
      >
        <div className="absolute top-2 right-2 z-50">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === item.id ? null : item.id); }}
            className="p-1 rounded-full hover:bg-gray-100 cursor-pointer"
            title="Folder options"
          >
            <EllipsisVerticalIcon className="h-5 w-5 text-gray-600" />
          </button>

          {menuOpenId === item.id && (
            <div
              ref={(el) => { if (el) menuRefs.current.set(item.id, el); else menuRefs.current.delete(item.id); }}
              className="absolute right-0 mt-2 w-44 bg-white border rounded-md shadow-lg z-50"
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleRenameFolder(item); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
              >
                Rename
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(item.id); setMenuOpenId(null); }}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                🗑 Delete
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3">
            <FolderIcon className="h-14 w-14 text-yellow-500" />
            <div className="font-medium truncate">{item.name}</div>
          </div>
          <div className="text-xs text-gray-500 mt-auto">Folder</div>
        </div>
      </div>
    );
  } else {
    const isImage = isImageItem(item);
    return (
      <div key={item.id} className="bg-white border rounded-lg shadow-sm overflow-hidden relative">
        <div className="absolute top-3 right-3 z-50">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === item.id ? null : item.id); }}
            className="p-1 rounded-full hover:bg-gray-100"
            title="Options"
          >
            <EllipsisVerticalIcon className="h-5 w-5 text-gray-600" />
          </button>

          {menuOpenId === item.id && (
            <div
              ref={(el) => { if (el) menuRefs.current.set(item.id, el); else menuRefs.current.delete(item.id); }}
              className="absolute right-0 mt-2 w-44 bg-white border rounded-md shadow-lg z-50"
            >
              <button
                onClick={() => { downloadFileById(item); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
              >
                <ArrowDownTrayIcon className="h-4 w-4 text-indigo-600" /> Download
              </button>
              <button
                onClick={() => { handleDeleteFile(item); }}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                🗑 Delete
              </button>
            </div>
          )}
        </div>

        <div
          className="w-full h-44 md:h-48 bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer"
          onClick={() => {
            if (isImage) setPreviewItem(item);
            else window.open(item.url, "_blank", "noopener,noreferrer");
          }}
        >
          {isImage ? (
            <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              {item.mimeType && item.mimeType.startsWith("image/") ? (
                <PhotoIcon className="h-12 w-12 text-blue-500" />
              ) : item.mimeType === "application/pdf" ? (
                <DocumentIcon className="h-12 w-12 text-red-500" />
              ) : (
                <DocumentIcon className="h-12 w-12 text-gray-700" />
              )}
            </div>
          )}
        </div>

        <div className="p-3">
          <div className="text-sm font-medium truncate">{item.name}</div>
          <div className="text-xs text-gray-500 mt-1">{humanFileSize(item.size)}</div>
        </div>
      </div>
    );
  }
})}

          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewItem && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={() => setPreviewItem(null)}>
          <div className="bg-white rounded-md overflow-hidden max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-3 border-b">
              <div className="text-sm font-medium">{previewItem.name}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadFileById(previewItem)} className="text-sm text-indigo-600 px-3 flex items-center gap-1"><ArrowDownTrayIcon className="h-4 w-4" /> Download</button>
                <button onClick={() => setPreviewItem(null)} className="px-3">Close</button>
              </div>
            </div>
            <div className="p-4">
              <img src={previewItem.url} alt={previewItem.name} className="w-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
