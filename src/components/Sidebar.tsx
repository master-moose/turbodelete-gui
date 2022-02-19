import { DriveInfo } from '../hooks/useFileSystem';
import { HardDrive, Monitor } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
    drives: DriveInfo[];
    currentPath: string;
    onNavigate: (path: string) => void;
}

export function Sidebar({ drives, currentPath, onNavigate }: SidebarProps) {
    return (
        <div className="w-60 bg-zinc-800 border-r border-zinc-700 flex flex-col h-full overflow-y-auto shrink-0 select-none">
            <div className="p-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Locations</div>

            <div
                className={cn(
                    "flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors border-l-2",
                    !currentPath ? "bg-zinc-700/50 border-blue-500 text-white" : "border-transparent text-gray-300 hover:bg-zinc-700 hover:text-white"
                )}
                onClick={() => onNavigate("")}
            >
                <Monitor size={18} className="text-blue-400" />
                <span className="text-sm">This PC</span>
            </div>

            <div className="mt-4">
                <div className="px-4 py-2 text-xs text-gray-500 font-medium flex items-center gap-2">
                    <span>Drives</span>
                    <div className="h-px bg-zinc-700 flex-1" />
                </div>
                {drives.map(drive => (
                    <div key={drive.mount_point}
                        className={cn(
                            "flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors border-l-2",
                            currentPath.startsWith(drive.mount_point) ? "bg-zinc-700/50 border-blue-500 text-white" : "border-transparent text-gray-300 hover:bg-zinc-700 hover:text-white"
                        )}
                        onClick={() => onNavigate(drive.mount_point + "\\")}
                    >
                        <HardDrive size={18} className="text-gray-400" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm truncate">{drive.name || "Local Disk"} ({drive.mount_point})</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
