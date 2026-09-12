/**
 * File System Access API directory picker. Available in Chromium-based
 * browsers only and not part of the TypeScript DOM lib.
 */
interface Window {
    showDirectoryPicker?: (options?: {
        mode?: "read" | "readwrite";
    }) => Promise<FileSystemDirectoryHandle>;
}
