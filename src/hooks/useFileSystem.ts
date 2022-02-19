import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface FileEntry {
    name: string;
    path: string;
    is_dir: boolean;
    size: number | null;
}

export interface DriveInfo {
    name: string;
    mount_point: string;
    total_space: number;
    available_space: number;
}

export function useFileSystem() {
    const [currentPath, setCurrentPath] = useState<string>("");
    const [entries, setEntries] = useState<FileEntry[]>([]);
    const [drives, setDrives] = useState<DriveInfo[]>([]);
    const [history, setHistory] = useState<string[]>([]); // simple history stack
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadDrives = useCallback(async () => {
        try {
            const d: DriveInfo[] = await invoke('get_drives');
            setDrives(d);
        } catch (e) {
            console.error("Failed to load drives", e);
        }
    }, []);

    const _loadPath = async (path: string) => {
        setLoading(true);
        setError(null);
        try {
            const files: FileEntry[] = await invoke('list_dir', { path });
            setEntries(files);
            setCurrentPath(path);
        } catch (e) {
            setError(String(e));
            setEntries([]);
        } finally {
            setLoading(false);
        }
    };

    const navigate = useCallback(async (path: string) => {
        if (!path) {
            setCurrentPath("");
            setEntries([]);
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push("");
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
            return;
        }

        await _loadPath(path);

        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(path);
            return newHistory;
        });
        setHistoryIndex(prev => prev + 1);
    }, [history, historyIndex]);

    const navigateInternal = async (path: string) => {
        if (!path) {
            setCurrentPath("");
            setEntries([]);
            return;
        }
        await _loadPath(path);
    };

    const goBack = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            navigateInternal(history[newIndex]);
        }
    };

    const goForward = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            navigateInternal(history[newIndex]);
        }
    };

    const navigateUp = () => {
        if (!currentPath) return;
        if (currentPath.endsWith(":\\")) {
            navigate("");
            return;
        }
        let p = currentPath.endsWith("\\") ? currentPath.slice(0, -1) : currentPath;
        const lastSep = p.lastIndexOf("\\");
        if (lastSep === -1) {
            navigate("");
        } else {
            const parent = p.substring(0, lastSep);
            navigate(parent.endsWith(":") ? parent + "\\" : parent);
        }
    };

    const refresh = () => {
        if (currentPath) _loadPath(currentPath);
        loadDrives();
    };

    const turboDelete = async (path: string) => {
        return await invoke('turbo_delete', { path });
    };

    useEffect(() => {
        loadDrives();
        setHistory([""]);
        setHistoryIndex(0);
    }, [loadDrives]);

    return {
        currentPath,
        entries,
        drives,
        navigate,
        goBack,
        goForward,
        navigateUp,
        refresh,
        loading,
        error,
        historyIndex,
        historyLength: history.length,
        turboDelete
    };
}
