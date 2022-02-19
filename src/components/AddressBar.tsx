import React from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, RefreshCw, Trash2 } from 'lucide-react';

interface AddressBarProps {
    currentPath: string;
    onNavigate: (path: string) => void;
    onBack: () => void;
    onForward: () => void;
    onUp: () => void;
    onRefresh: () => void;
    onDelete: () => void;
    canBack: boolean;
    canForward: boolean;
    selectedCount: number;
}

export function AddressBar({
    currentPath, onNavigate, onBack, onForward, onUp, onRefresh, onDelete,
    canBack, canForward, selectedCount
}: AddressBarProps) {
    const [localPath, setLocalPath] = React.useState(currentPath);

    React.useEffect(() => {
        setLocalPath(currentPath || "This PC");
    }, [currentPath]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (localPath !== "This PC") onNavigate(localPath);
    };

    return (
        <div className="flex items-center gap-2 p-2 border-b border-zinc-700 bg-zinc-900 shadow-sm z-10">
            <div className="flex gap-1">
                <button disabled={!canBack} onClick={onBack} className="p-1.5 hover:bg-zinc-700 text-gray-300 hover:text-white rounded disabled:opacity-30 transition-colors"><ArrowLeft size={16} /></button>
                <button disabled={!canForward} onClick={onForward} className="p-1.5 hover:bg-zinc-700 text-gray-300 hover:text-white rounded disabled:opacity-30 transition-colors"><ArrowRight size={16} /></button>
                <button onClick={onUp} className="p-1.5 hover:bg-zinc-700 text-gray-300 hover:text-white rounded transition-colors"><ArrowUp size={16} /></button>
            </div>

            <button onClick={onRefresh} className="p-1.5 hover:bg-zinc-700 text-gray-300 hover:text-white rounded transition-colors"><RefreshCw size={16} /></button>

            <form onSubmit={handleSubmit} className="flex-1 mx-2 flex gap-2">
                <div className="flex-1 relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Monitor size={14} className="text-gray-500" />
                    </div>
                    <input
                        className="w-full border border-zinc-600 bg-zinc-800 text-white pl-9 pr-3 py-1.5 rounded text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder-gray-500"
                        value={localPath}
                        onChange={(e) => setLocalPath(e.target.value)}
                        onBlur={() => setLocalPath(currentPath || "This PC")}
                    />
                </div>
            </form>

            {selectedCount > 0 && (
                <button
                    onClick={onDelete}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600/90 text-white rounded hover:bg-red-600 text-sm font-medium transition-colors border border-red-500/50 shadow-lg shadow-red-900/20"
                >
                    <Trash2 size={16} />
                    <span>Turbo Delete ({selectedCount})</span>
                </button>
            )}
        </div>
    )
}

function Monitor({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" />
        </svg>
    )
}
