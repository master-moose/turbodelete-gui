import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDangerous = false,
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
            <div
                className="bg-zinc-900 border border-zinc-700 shadow-2xl rounded w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center gap-2 text-white font-medium">
                        {isDangerous && <AlertTriangle size={18} className="text-red-500" />}
                        <span>{title}</span>
                    </div>
                    <button onClick={onCancel} className="text-gray-500 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 text-gray-300">
                    {message}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-4 py-3 bg-zinc-800/50 border-t border-zinc-800">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded text-sm font-medium text-gray-300 hover:bg-zinc-700 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded text-sm font-medium text-white transition-colors shadow-lg ${isDangerous
                            ? "bg-red-600 hover:bg-red-500 shadow-red-900/20"
                            : "bg-blue-600 hover:bg-blue-500 shadow-blue-900/20"
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
