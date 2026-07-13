/**
 * A set of items picked for sharing: loose files and whole folders.
 * Produced by the file/folder inputs and by drag and drop.
 */

export interface FolderFile {
    file: File;
    /**
     * Slash-separated path within the selection, including the folder name
     * as first segment (same format as File.webkitRelativePath),
     * e.g. "photos/2024/img.jpg".
     */
    relativePath: string;
}

export interface SharedFolder {
    name: string;
    files: FolderFile[];
}

export interface ShareSelection {
    files: File[];
    folders: SharedFolder[];
}
