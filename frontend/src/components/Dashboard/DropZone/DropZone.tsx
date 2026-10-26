import { DragEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { useContentHeight } from "../../../hooks/useContentHeight";
import { useTimeout } from "../../../hooks/useTimeout";
import { cx } from "class-variance-authority";

const FLASH_OK_MS = 1800;
const FLASH_WARN_MS = 2500;

interface DropZoneProps {
    /** Uppercase token of a recipient that files can go to, or null. */
    recipient: string | null;
    onSelection: (selection: ShareSelection) => void;
}

type Flash = { kind: "ok" | "warn"; text: string };

export default function DropZone({ recipient, onSelection }: DropZoneProps) {
    const { t } = useTranslation("dashboard");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const isTouchDevice = useIsTouchDevice();
    const [overZone, setOverZone] = useState(false);
    const [pageDrag, setPageDrag] = useState(false);
    const [flash, setFlash] = useState<Flash | null>(null);
    const flashEnd = useTimeout();
    const hintRef = useRef<HTMLSpanElement>(null);
    const hintHeight = useContentHeight(hintRef);

    useEffect(() => {
        if (isTouchDevice) {
            return;
        }
        // Elements the dragged file is over. Dragenter on the next element fires
        // before dragleave on the last one, so an empty list means the drag left the page.
        let targets: EventTarget[] = [];
        const endPageDrag = () => {
            targets = [];
            setPageDrag(false);
            setOverZone(false);
        };
        const handlePageDragEnter = (event: globalThis.DragEvent) => {
            if (!event.dataTransfer?.types.includes("Files") || !event.target) {
                return;
            }
            targets.push(event.target);
            setPageDrag(true);
        };
        const handlePageDragLeave = (event: globalThis.DragEvent) => {
            // An element removed mid-drag never fires dragleave.
            targets = targets.filter(
                target =>
                    target !== event.target && document.contains(target as Node)
            );
            if (targets.length === 0) {
                endPageDrag();
            }
        };
        window.addEventListener("dragenter", handlePageDragEnter);
        window.addEventListener("dragleave", handlePageDragLeave);
        window.addEventListener("drop", endPageDrag);
        return () => {
            window.removeEventListener("dragenter", handlePageDragEnter);
            window.removeEventListener("dragleave", handlePageDragLeave);
            window.removeEventListener("drop", endPageDrag);
        };
    }, [isTouchDevice]);

    const showFlash = (next: Flash) => {
        setFlash(next);
        flashEnd.set(
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
            showFlash({ kind: "warn", text: t("dropZone.pickRecipient") });
            return;
        }
        onSelection(selection);
        showFlash({
            kind: "ok",
            text:
                selection.folders.length === 1 && selection.files.length === 0
                    ? t("dropZone.sendingFolder", {
                          name: selection.folders[0].name,
                      })
                    : t("dropZone.sendingFiles", { count }),
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
                          ? t("dropZone.releaseTo", { token: recipient })
                          : t("dropZone.release"),
                      icon: "drop",
                  }
                : pageDrag
                  ? {
                        className: css.page,
                        edge: css.edgeDrop,
                        text: t("dropZone.dropHere"),
                        icon: "drop",
                    }
                  : null;
    const dimming = (overZone || pageDrag) && !flash;

    const hint = !recipient
        ? t("dropZone.pickRecipient")
        : isTouchDevice
          ? t("dropZone.pick")
          : t("dropZone.pickOrDrag");

    return (
        <div
            className={cx(css.zone, overlay?.edge, dimming && css.dimming)}
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
                className={cx(css.shareButton, css.fileButton)}
                disabled={!recipient}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className={css.fileIconContainer}>
                    <CodeFileIcon className={css.fileIcon1} />
                    <ImageFileIcon className={css.fileIcon2} />
                    <ZipFileIcon className={css.fileIcon3} />
                </div>
                {t("dropZone.shareFile")}
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
                className={cx(css.shareButton, css.folderButton)}
                disabled={!recipient}
                onClick={() => folderInputRef.current?.click()}
            >
                <div className={css.folderIconContainer}>
                    <FolderIcon className={css.folderClosed} />
                    <FolderOpenIcon className={css.folderOpen} />
                </div>
                {t("dropZone.shareFolder")}
            </Button>
            <div className={css.hintFrame} style={{ height: hintHeight }}>
                <span ref={hintRef} className={css.hint}>
                    {hint}
                </span>
            </div>
            {overlay && (
                <div
                    role="status"
                    className={cx(css.overlay, overlay.className)}
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
