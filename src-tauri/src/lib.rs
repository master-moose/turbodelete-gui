use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{Emitter, Window};
use rayon::iter::{IntoParallelRefIterator, ParallelBridge, ParallelIterator};
use jwalk::WalkDir;
use sysinfo::Disks;
use std::os::windows::process::CommandExt;

#[derive(Serialize)]
struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    size: Option<u64>,
}

#[derive(Serialize)]
struct DriveInfo {
    name: String,
    mount_point: String,
    total_space: u64,
    available_space: u64,
}

#[derive(Serialize, Clone)]
struct ProgressPayload {
    total: u64,
    current: u64,
    current_file: String,
}

#[tauri::command]
fn get_drives() -> Vec<DriveInfo> {
    let disks = Disks::new_with_refreshed_list();
    disks.list().iter().map(|disk| {
        DriveInfo {
            name: disk.name().to_string_lossy().into_owned(),
            mount_point: disk.mount_point().to_string_lossy().replace("\\", ""),
            total_space: disk.total_space(),
            available_space: disk.available_space(),
        }
    }).collect()
}

#[tauri::command]
fn list_dir(path: String) -> Result<Vec<FileEntry>, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("Path does not exist".to_string());
    }
    
    let mut entries = Vec::new();
    match std::fs::read_dir(p) {
        Ok(read_dir) => {
            for entry in read_dir {
                if let Ok(entry) = entry {
                    let path_buf = entry.path();
                    let name = entry.file_name().to_string_lossy().into_owned();
                    let is_dir = path_buf.is_dir();
                    let size = if is_dir { None } else {
                        Some(entry.metadata().map(|m| m.len()).unwrap_or(0))
                    };
                    
                    entries.push(FileEntry {
                        name,
                        path: path_buf.to_string_lossy().into_owned(),
                        is_dir,
                        size
                    });
                }
            }
        }
        Err(e) => return Err(e.to_string()),
    }
    
    entries.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then_with(|| a.name.cmp(&b.name)) 
    });
    
    Ok(entries)
}

#[tauri::command]
async fn turbo_delete(path: String, window: Window) -> Result<f32, String> {
    let target_path = PathBuf::from(&path);
    if !target_path.exists() {
        return Err("Path does not exist".to_string());
    }

    // --- Safety Guards ---
    let target_lossy = target_path.to_string_lossy().to_lowercase();
    
    // 1. Root Protection
    if target_path.parent().is_none() || target_lossy.ends_with(":\\") {
         return Err("SAFETY ALERT: Cannot delete a drive root using Turbo Delete.".to_string());
    }

    // 2. Windows System Protection
    let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string()).to_lowercase();
    let norm_target = target_lossy.replace("/", "\\").trim_end_matches('\\').to_string();
    let norm_sys = system_root.replace("/", "\\").trim_end_matches('\\').to_string();

    if norm_target == norm_sys {
         return Err("SAFETY ALERT: Cannot delete the active Windows System directory.".to_string());
    }
   
    if norm_target.ends_with(":\\users") || norm_target.ends_with(":\\program files") || norm_target.ends_with(":\\program files (x86)") {
         return Err("SAFETY ALERT: Cannot delete core system folders.".to_string());
    }
    // End Safety Guards
    
    let start = std::time::Instant::now();

    // --- Take Ownership (Recursive) ---
    if target_path.is_dir() {
        let _ = window.emit("delete-status", "Taking ownership (this may take a while)...");
        
        let _ = std::process::Command::new("takeown")
            .args(["/f", &path, "/r", "/d", "y"])
            .creation_flags(0x08000000) 
            .output();

        let _ = std::process::Command::new("icacls")
            .args([&path, "/grant", "administrators:F", "/t", "/c", "/q"])
            .creation_flags(0x08000000)
            .output();
    }

    let _ = window.emit("delete-status", "Scanning...");

    // 1. Collect all items
    let entries: Vec<_> = WalkDir::new(&target_path)
            .follow_links(false)
            .skip_hidden(false)
            .into_iter()
            .par_bridge()
            .filter_map(|v| v.ok())
            .collect();
            
    let total_items = entries.len();
    let _ = window.emit("delete-status", format!("Found {} items. Deleting...", total_items));

    let (mut dirs, files): (Vec<_>, Vec<_>) = entries.into_iter().partition(|e| e.path().is_dir());
    dirs.sort_by_key(|a| std::cmp::Reverse(a.depth()));

    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;

    let processed_count = Arc::new(AtomicUsize::new(0));
    let skipped_count = Arc::new(AtomicUsize::new(0));
    let total_items_u64 = total_items as u64;

    // Helper to un-readonly
    let unprotect = |p: &Path| {
        // Try to strip Read-only
        if let Ok(metadata) = std::fs::symlink_metadata(p) {
            let mut perms = metadata.permissions();
            if perms.readonly() {
                perms.set_readonly(false);
                let _ = std::fs::set_permissions(p, perms);
            }
        }
    };

    // 2. Delete Files Parallel
    files.par_iter().for_each(|entry| {
        let p = entry.path();
        unprotect(&p);
        
        let res = std::fs::remove_file(p);
        if res.is_err() {
            skipped_count.fetch_add(1, Ordering::Relaxed);
        }

        let current = processed_count.fetch_add(1, Ordering::Relaxed) + 1;
        if current % 100 == 0 || current == total_items { 
            let _ = window.emit("delete-progress", ProgressPayload {
                total: total_items_u64,
                current: current as u64,
                current_file: entry.file_name().to_string_lossy().into_owned()
            });
        }
    });

    // 3. Delete Directories
    for dir in dirs {
        let p = dir.path();
        unprotect(&p);
        let res = std::fs::remove_dir(p);
        if res.is_err() {
             skipped_count.fetch_add(1, Ordering::Relaxed);
        }
        
        let current = processed_count.fetch_add(1, Ordering::Relaxed) + 1;
         if current % 100 == 0 {
            let _ = window.emit("delete-progress", ProgressPayload {
                total: total_items_u64,
                current: current as u64,
                current_file: dir.file_name().to_string_lossy().into_owned()
            });
        }
    }

    // 4. Cleanup Root
    if target_path.exists() {
         unprotect(&target_path);
         if target_path.is_dir() {
             let _ = std::fs::remove_dir(&target_path);
         } else {
             let _ = std::fs::remove_file(&target_path);
         }
    }
    
    let skipped = skipped_count.load(Ordering::Relaxed);
    
    // Final emission
    let _ = window.emit("delete-progress", ProgressPayload {
        total: total_items_u64,
        current: total_items_u64,
        current_file: "Done".to_string()
    });

    let elapsed = start.elapsed().as_secs_f32();
    let msg = if skipped > 0 {
        format!("Done in {:.2}s. Skipped {} items (locked/access denied).", elapsed, skipped)
    } else {
        format!("Done in {:.2}s", elapsed)
    };
    
    let _ = window.emit("delete-status", msg);
    
    Ok(elapsed)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_drives, list_dir, turbo_delete])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
