interface ProgressModalProps {
    isOpen: boolean;
    total: number;
    current: number;
    currentFile: string;
    onCancel?: () => void;
}

// Helper to format large numbers
const fmt = (n: number) => new Intl.NumberFormat().format(n);

export function ProgressModal({ isOpen, total, current, currentFile }: ProgressModalProps) {
    if (!isOpen) return null;

    const percent = total > 0 ? Math.min(100, (current / total) * 100) : 0;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700 shadow-2xl rounded-lg w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">

                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                        </span>
                        Turbo Deleting...
                    </h3>
                    <div className="text-xs text-gray-400 font-mono">
                        {fmt(current)} / {fmt(total)}
                    </div>
                </div>

                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                    <div
                        className="h-full bg-blue-500 transition-all duration-200 ease-out"
                        style={{ width: `${percent}%` }}
                    />
                </div>

                <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{percent.toFixed(1)}%</span>
                </div>

                <div className="mt-4 p-2 bg-zinc-950/50 rounded border border-zinc-800 font-mono text-xs text-gray-500 truncate h-8 flex items-center">
                    {currentFile || "Preparing..."}
                </div>

            </div>
        </div>
    );
}
