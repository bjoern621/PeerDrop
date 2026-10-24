import { DragEvent, useEffect, useRef, useState } from "react";
import css from "./DropZone.module.scss";
import Button from "../../Button/Button";
import {
    IconFileCode as CodeFileIcon,
    IconFileTypeJpg as ImageFileIcon,
    IconFileZip as ZipFileIcon,
    IconFolder as FolderIcon,
    IconFolderOpen as FolderOpenIcon,
    IconDragDrop as DropIcon,
    IconCheck as CheckIcon,
    IconAlertTriangle as WarningIcon,
} from "@tabler/icons-react";
import { ShareSelection } from "../../../types/transfer/ShareSelection";
import {
    collectDroppedSelection,
    selectionFromFileList,
} from "../../../util/shareSelection";
import { useIsTouchDevice } from "../../../hooks/useIsTouchDevice";

const FLASH_OK_MS = 1800;
const FLASH_WARN_MS = 2500;
// Dragover repeats about every 50 ms while a file hovers the page, so a
// short silence means the drag left the page.
const DRAG_SILENCE_MS = 250;

interface DropZoneProps {
    /** Uppercase token of a recipient that files can go to, or null. */
    recipient: string | null;
    onSelection: (selection: ShareSelection) => void;
}

type Flash = { kind: "ok" | "warn"; text: string };

export default function DropZone({ recipient, onSelection }: DropZoneProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const isTouchDevice = useIsTouchDevice();
    const [overZone, setOverZone] = useState(false);
    const [pageDrag, setPageDrag] = useState(false);
    const [flash, setFlash] = useState<Flash | null>(null);
    const flashTimer = useRef<number | undefined>(undefined);
    const dragTimer = useRef<number | undefined>(undefined);

    useEffect(() => {
        if (isTouchDevice) {
            return;
        }
        const handlePageDragOver = (event: globalThis.DragEvent) => {
            if (!event.dataTransfer?.types.includes("Files")) {
                return;
            }
            setPageDrag(true);
            window.clearTimeout(dragTimer.current);
            dragTimer.current = window.setTimeout(() => {
                setPageDrag(false);
                setOverZone(false);
            }, DRAG_SILENCE_MS);
        };
        window.addEventListener("dragover", handlePageDragOver);
        return () => {
            window.removeEventListener("dragover", handlePageDragOver);
            window.clearTimeout(dragTimer.current);
            window.clearTimeout(flashTimer.current);
        };
    }, [isTouchDevice]);

    const showFlash = (next: Flash) => {
        setFlash(next);
        window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(
            () => setFlash(null),
            next.kind === "ok" ? FLASH_OK_MS : FLASH_WARN_MS
        );
    };

    const send = (selection: ShareSelection) => {
        const count =
            selection.files.length +
            selection.folders.reduce((sum, f) => sum + f.files.length, 0);
        if (count === 0) {
            return;
        }
        if (!recipient) {
            showFlash({ kind: "warn", text: "Wähle zuerst einen Empfänger" });
            return;
        }
        onSelection(selection);
        showFlash({
            kind: "ok",
            text:
                selection.folders.length === 1 && selection.files.length === 0
                    ? `Ordner „${selection.folders[0].name}“ wird gesendet`
                    : count === 1
                      ? "1 Datei wird gesendet"
                      : `${count} Dateien werden gesendet`,
        });
    };

    const handleDrop = (event: DragEvent) => {
        event.preventDefault();
        setOverZone(false);
        setPageDrag(false);
        void collectDroppedSelection(event.dataTransfer)
            .then(send)
            .catch((err: unknown) => {
                console.error("Failed to read dropped items:", err);
            });
    };

    const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            send(selectionFromFileList(event.target.files));
        }
        event.target.value = "";
    };

    const overlay: {
        className: string;
        edge: string;
        text: string;
        icon: "drop" | "ok" | "warn";
    } | null =
        flash?.kind === "warn"
            ? {
                  className: css.warn,
                  edge: css.edgeWarn,
                  text: flash.text,
                  icon: "warn",
              }
            : flash
              ? {
                    className: css.ok,
                    edge: css.edgeOk,
                    text: flash.text,
                    icon: "ok",
                }
              : overZone
                ? {
                      className: css.drop,
                      edge: css.edgeDrop,
                      text: recipient
                          ? `Loslassen, um an ${recipient} zu senden`
                          : "Loslassen",
                      icon: "drop",
                  }
                : pageDrag
                  ? {
                        className: css.page,
                        edge: css.edgeDrop,
                        text: "Hier ablegen",
                        icon: "drop",
                    }
                  : null;
    const dimming = (overZone || pageDrag) && !flash;

    const hint = !recipient
        ? "Wähle zuerst einen Empfänger"
        : isTouchDevice
          ? "Wähle Dateien oder einen Ordner"
          : "Wähle Dateien oder einen Ordner oder ziehe sie hierher";

    return (
        <div
            className={`${css.zone} ${overlay?.edge ?? ""} ${dimming ? css.dimming : ""}`}
            onDragOver={event => {
                event.preventDefault();
                if (!overZone) setOverZone(true);
            }}
            onDragLeave={event => {
                if (
                    !event.currentTarget.contains(event.relatedTarget as Node)
                ) {
                    setOverZone(false);
                }
            }}
            onDrop={handleDrop}
        >
            <input
                type="file"
                ref={fileInputRef}
                multiple
                onChange={handleInput}
                className={css.input}
            />
            <Button
                variant="outline"
                color_scheme="primary"
                alignment="vertical"
                className={`${css.shareButton} ${css.fileButton}`}
                disabled={!recipient}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className={css.fileIconContainer}>
                    <CodeFileIcon className={css.fileIcon1} />
                    <ImageFileIcon className={css.fileIcon2} />
                    <ZipFileIcon className={css.fileIcon3} />
                </div>
                Datei teilen
            </Button>
            <input
                type="file"
                ref={folderInputRef}
                // @ts-expect-error - webkitdirectory is not in the types but is widely supported
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleInput}
                className={css.input}
            />
            <Button
                variant="outline"
                color_scheme="primary"
                alignment="vertical"
                className={`${css.shareButton} ${css.folderButton}`}
                disabled={!recipient}
                onClick={() => folderInputRef.current?.click()}
            >
                <div className={css.folderIconContainer}>
                    <FolderIcon className={css.folderClosed} />
                    <FolderOpenIcon className={css.folderOpen} />
                </div>
                Ordner teilen
            </Button>
            <span className={css.hint}>{hint}</span>
            {overlay && (
                <div
                    role="status"
                    className={`${css.overlay} ${overlay.className}`}
                >
                    {overlay.icon === "drop" && <DropIcon aria-hidden />}
                    {overlay.icon === "ok" && <CheckIcon aria-hidden />}
                    {overlay.icon === "warn" && <WarningIcon aria-hidden />}
                    <span>{overlay.text}</span>
                </div>
            )}
        </div>
    );
}
