import { useEffect } from "react";

/**
 * Prevents the browser's default behaviour of navigating to (and thereby
 * opening) a file when it is dropped anywhere on the page.
 *
 * Without this guard a stray file drop unloads the SPA, which fires
 * `beforeunload` and tears down the active connection. This happens on touch
 * devices, where the drop zone is intentionally disabled, as well as on
 * desktop when a file is dropped outside the drop zone.
 *
 * The dedicated drop zone (DragDropOverlay) stops propagation on its own
 * handlers, so intentional drops there are unaffected by this global guard.
 */
export function usePreventFileDropNavigation(): void {
    useEffect(() => {
        const prevent = (e: DragEvent) => e.preventDefault();

        window.addEventListener("dragover", prevent);
        window.addEventListener("drop", prevent);

        return () => {
            window.removeEventListener("dragover", prevent);
            window.removeEventListener("drop", prevent);
        };
    }, []);
}
