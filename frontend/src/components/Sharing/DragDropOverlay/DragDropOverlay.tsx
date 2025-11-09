import { useRef, useState } from "react";
import DragDropIcon from "../../../assets/illustrations/drag_and_drop.svg?react";
import css from "./DragDropOverlay.module.scss";

interface DragDropOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
    onFilesDropped: (files: FileList) => void;
    children: React.ReactNode;
}

export default function DragDropOverlay({
    onFilesDropped,
    children,
    className,
}: DragDropOverlayProps) {
    const [isDragging, setIsDragging] = useState(false);
    const dragCounterRef = useRef(0); // Counter for drag depth to handle nested element enter/leave events

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current++;
        if (dragCounterRef.current >= 1) {
            setIsDragging(true);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current--;
        if (dragCounterRef.current <= 0) {
            setIsDragging(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDragging(false);

        const droppedFiles = e.dataTransfer.files;

        if (!droppedFiles || droppedFiles.length === 0) {
            return;
        }

        onFilesDropped(droppedFiles);
    };

    return (
        <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`${css.dropAreaContainer} ${className || ""}`}
        >
            {children}

            <div
                className={`${css.dropArea} ${isDragging ? css.dropAreaActive : ""}`}
            >
                <div>
                    <DragDropIcon className={css.dragDropIcon} />
                    <p className={css.dropAreaMessage}>Drag and Drop</p>
                </div>
            </div>
        </div>
    );
}
