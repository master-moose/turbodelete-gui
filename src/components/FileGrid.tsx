import React, { useRef, useState, useEffect } from 'react';
import { FileEntry, DriveInfo } from '../hooks/useFileSystem';
import { Folder, File, HardDrive } from 'lucide-react';
import { cn } from '../lib/utils';

interface FileGridProps {
    currentPath: string;
    entries: FileEntry[];
    drives: DriveInfo[];
    onNavigate: (path: string) => void;
    selectedPaths: string[];
    onSelectionChange: (paths: string[]) => void;
    onContextMenu: (e: React.MouseEvent, path: string) => void;
}

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function FileGrid({ currentPath, entries, drives, onNavigate, selectedPaths, onSelectionChange, onContextMenu }: FileGridProps) {
    const isRoot = !currentPath;
    const containerRef = useRef<HTMLDivElement>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);

    const handleClick = (path: string, metaKey: boolean) => {
        if (metaKey) {
            if (selectedPaths.includes(path)) {
                onSelectionChange(selectedPaths.filter(p => p !== path));
            } else {
                onSelectionChange([...selectedPaths, path]);
            }
        } else {
            onSelectionChange([path]);
        }
    };

    const handleDoubleClick = (path: string, isDir: boolean) => {
        if (isDir) {
            onNavigate(path);
        }
    };

    // Calculate selection intersection
    useEffect(() => {
        if (!isSelecting || !selectionBox || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const startX = Math.min(selectionBox.startX, selectionBox.currentX);
        const startY = Math.min(selectionBox.startY, selectionBox.currentY);
        const endX = Math.max(selectionBox.startX, selectionBox.currentX);
        const endY = Math.max(selectionBox.startY, selectionBox.currentY);

        const newSelected: string[] = [];
        const items = containerRef.current.querySelectorAll('[data-path]');

        items.forEach((item) => {
            const rect = item.getBoundingClientRect();
            // Convert selection box to viewport coordinates for comparison
            const selRectLeft = containerRect.left + startX;
            const selRectTop = containerRect.top + startY;
            const selRectRight = containerRect.left + endX;
            const selRectBottom = containerRect.top + endY;

            if (selRectLeft < rect.right && selRectRight > rect.left && selRectTop < rect.bottom && selRectBottom > rect.top) {
                const path = item.getAttribute('data-path');
                if (path) newSelected.push(path);
            }
        });

        if (newSelected.length > 0 || selectedPaths.length > 0) {
            const isSame = newSelected.length === selectedPaths.length && newSelected.every(p => selectedPaths.includes(p));
            if (!isSame) {
                onSelectionChange(newSelected);
            }
        }

    }, [selectionBox, isSelecting]);

    const onMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only left click

        // Check if clicked on item
        if (e.target instanceof Element && e.target.closest('[data-path]')) {
            return;
        }

        // Available space click -> Start selection
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setIsSelecting(true);
        setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y });
        onSelectionChange([]); // Clear selection on start
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isSelecting || !selectionBox || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setSelectionBox(prev => prev ? ({ ...prev, currentX: x, currentY: y }) : null);
    };

    const onMouseUp = () => {
        setIsSelecting(false);
        setSelectionBox(null);
    };

    useEffect(() => {
        if (isSelecting) {
            window.addEventListener('mouseup', onMouseUp);
            return () => window.removeEventListener('mouseup', onMouseUp);
        }
    }, [isSelecting]);


    if (isRoot) {
        return (
            <div className="p-4 select-none h-full" onClick={() => onSelectionChange([])}>
                <div className="flex items-center gap-2 mb-2">
                    <div className="text-gray-300 font-medium text-sm transition-all flex items-center gap-1">
                        <span className="transform rotate-90 text-[10px] text-gray-500">▶</span>
                        Devices and drives ({drives.length})
                    </div>
                    <div className="h-px bg-zinc-700 flex-1 opacity-50" />
                </div>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                    {drives.map(drive => {
                        const used = drive.total_space - drive.available_space;
                        const percent = Math.min(100, Math.max(0, (used / drive.total_space) * 100));
                        const barColor = percent > 90 ? "bg-red-500" : "bg-blue-500";
                        return (
                            <div key={drive.mount_point}
                                className="flex gap-4 p-3 hover:bg-zinc-800 rounded-sm cursor-pointer border border-transparent hover:border-zinc-600 transition-colors group"
                                onDoubleClick={() => onNavigate(drive.mount_point + "\\")}
                                onClick={(e) => { e.stopPropagation(); onSelectionChange([]); }}
                            >
                                <div className="shrink-0 flex items-center">
                                    <HardDrive size={40} className="text-gray-400" strokeWidth={1.5} />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                    <div className="font-medium text-sm text-gray-200 truncate">{drive.name || "Local Disk"} ({drive.mount_point})</div>
                                    <div className="h-4 bg-zinc-700 w-full relative border border-zinc-600">
                                        <div className={cn("h-full transition-all duration-500", barColor)} style={{ width: `${percent}%` }} />
                                    </div>
                                    <div className="text-xs text-gray-400">{formatBytes(drive.available_space)} free of {formatBytes(drive.total_space)}</div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    if (entries.length === 0) {
        return <div className="p-8 text-center text-gray-500 h-full">This folder is empty.</div>
    }

    const boxStyle: React.CSSProperties | undefined = selectionBox ? {
        position: 'absolute',
        left: Math.min(selectionBox.startX, selectionBox.currentX),
        top: Math.min(selectionBox.startY, selectionBox.currentY),
        width: Math.abs(selectionBox.currentX - selectionBox.startX),
        height: Math.abs(selectionBox.currentY - selectionBox.startY),
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        border: '1px solid rgba(59, 130, 246, 0.5)',
        pointerEvents: 'none',
        zIndex: 50
    } : undefined;

    return (
        <div
            ref={containerRef}
            className="p-4 relative min-h-full"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
        >
            <div className="flex items-center gap-2 mb-2">
                <div className="text-gray-300 font-medium text-sm flex items-center gap-1">
                    <span className="transform rotate-90 text-[10px] text-gray-500">▶</span>
                    Items ({entries.length})
                </div>
                <div className="h-px bg-zinc-700 flex-1 opacity-50" />
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-1">
                {entries.map(entry => {
                    const isSelected = selectedPaths.includes(entry.path);
                    return (
                        <div key={entry.path}
                            data-path={entry.path}
                            className={cn(
                                "flex flex-col items-center p-2 rounded-sm cursor-pointer border transition-colors group select-none",
                                isSelected ? "bg-blue-500/20 border-blue-500/50" : "hover:bg-zinc-800 border-transparent hover:border-zinc-700"
                            )}
                            onClick={(e) => {
                                e.stopPropagation(); // Stop propagation so main div doesn't start selection
                                handleClick(entry.path, e.ctrlKey || e.metaKey);
                            }}
                            onDoubleClick={() => handleDoubleClick(entry.path, entry.is_dir)}
                            onContextMenu={(e) => onContextMenu(e, entry.path)}
                            title={entry.name}
                        >
                            {entry.is_dir ? (
                                <Folder size={48} className="text-yellow-500 mb-1 fill-yellow-500/20" strokeWidth={1} />
                            ) : (
                                <File size={48} className="text-gray-400 mb-1" strokeWidth={1} />
                            )}
                            <span className={cn("text-xs text-center break-all line-clamp-2 w-full select-none", isSelected ? "text-white" : "text-gray-300 group-hover:text-white")}>{entry.name}</span>
                        </div>
                    )
                })}
            </div>

            {isSelecting && selectionBox && (
                <div style={boxStyle} />
            )}
        </div>
    );
}
