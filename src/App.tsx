import React, { useState, useEffect } from "react";
import { useFileSystem } from "./hooks/useFileSystem";
import { FileGrid } from "./components/FileGrid";
import { AddressBar } from "./components/AddressBar";
import { Sidebar } from "./components/Sidebar";
import { listen } from "@tauri-apps/api/event";
import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ProgressModal } from './components/ProgressModal';

function App() {
  const {
    currentPath, entries, drives, navigate, goBack, goForward, navigateUp,
    refresh, loading, error, historyIndex, historyLength, turboDelete
  } = useFileSystem();

  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [deleteStatus, setDeleteStatus] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, path: string } | null>(null);

  // Confirmation State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState("");

  // Progress State
  const [progress, setProgress] = useState<{ total: number, current: number, currentFile: string } | null>(null);

  useEffect(() => {
    let unlistenStatus: (() => void) | undefined;
    let unlistenProgress: (() => void) | undefined;

    listen("delete-status", (event) => {
      setDeleteStatus(event.payload as string);
    }).then(f => unlistenStatus = f);

    listen("delete-progress", (event) => {
      const p = event.payload as { total: number, current: number, current_file: string };
      setProgress({
        total: p.total,
        current: p.current,
        currentFile: p.current_file
      });
    }).then(f => unlistenProgress = f);

    const checkClick = () => {
      setContextMenu(null);
    };
    window.addEventListener("click", checkClick);
    window.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });

    return () => {
      if (unlistenStatus) unlistenStatus();
      if (unlistenProgress) unlistenProgress();
      window.removeEventListener("click", checkClick);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, path });

    if (!selectedPaths.includes(path)) {
      setSelectedPaths([path]);
    }
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    setDeleteStatus("Starting...");
    setProgress(null);

    try {
      for (const path of selectedPaths) {
        await turboDelete(path);
      }
      refresh();
      setSelectedPaths([]);
    } catch (e) {
      setDeleteStatus("Error: " + e);
      alert("Error deleting: " + e);
    } finally {
      setIsDeleting(false);
      setTimeout(() => setDeleteStatus(""), 3000);
    }
  };

  const handleDelete = async () => {
    if (selectedPaths.length === 0 || isDeleting) return;

    setConfirmMessage(`Are you sure you want to TURBO delete ${selectedPaths.length} items? This cannot be undone.`);
    setConfirmCallback(() => executeDelete);
    setIsConfirmOpen(true);
  };

  const handleContextDelete = () => {
    if (contextMenu) {
      handleDelete();
      setContextMenu(null);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-900 text-gray-100 font-sans select-none text-sm" onContextMenu={(e) => e.preventDefault()}>
      <Sidebar drives={drives} currentPath={currentPath} onNavigate={navigate} />

      <div className="flex-1 flex flex-col min-w-0">
        <AddressBar
          currentPath={currentPath}
          onNavigate={navigate}
          onBack={goBack}
          onForward={goForward}
          onUp={navigateUp}
          onRefresh={refresh}
          onDelete={handleDelete}
          canBack={historyIndex > 0}
          canForward={historyIndex < historyLength - 1}
          selectedCount={selectedPaths.length}
        />

        {(deleteStatus || loading) && (
          <div className="bg-blue-900/50 px-4 py-1 text-xs text-blue-200 border-b border-blue-800 flex justify-between animate-in fade-in slide-in-from-top-1">
            <span>{deleteStatus || (loading ? "Loading..." : "Ready")}</span>
            {loading && <span className="animate-pulse">Busy...</span>}
          </div>
        )}

        <div className="flex-1 overflow-y-auto" onClick={() => setSelectedPaths([])}>
          {error ? (
            <div className="p-8 text-red-500">Error: {error}</div>
          ) : (
            <div onClick={(e) => e.stopPropagation()} className="h-full relative">
              <FileGrid
                currentPath={currentPath}
                entries={entries}
                drives={drives}
                onNavigate={navigate}
                selectedPaths={selectedPaths}
                onSelectionChange={setSelectedPaths}
                onContextMenu={handleContextMenu}
              />
            </div>
          )}
        </div>

        <div className="bg-zinc-800 border-t border-zinc-700 px-4 py-1 text-xs text-gray-400 flex justify-between">
          <span>{entries.length} items</span>
          <span>{selectedPaths.length > 0 ? `${selectedPaths.length} selected` : ""}</span>
        </div>
      </div>

      {contextMenu && (
        <div
          className="fixed bg-zinc-800 border border-zinc-700 shadow-xl rounded py-1 z-50 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleContextDelete}
            className="w-full text-left px-4 py-2 hover:bg-zinc-700 text-red-400 hover:text-red-300 flex items-center gap-2"
          >
            <Trash2 size={16} />
            <span>Turbo Delete</span>
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Confirm Turbo Delete"
        message={confirmMessage}
        onConfirm={() => {
          if (confirmCallback) confirmCallback();
          setIsConfirmOpen(false);
        }}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText="Turbo Delete"
        isDangerous={true}
      />

      <ProgressModal
        isOpen={isDeleting && progress !== null}
        total={progress?.total || 1}
        current={progress?.current || 0}
        currentFile={progress?.currentFile || ""}
      />
    </div>
  );
}

export default App;
