import { useWindowEvent } from "./useWindowEvent";

/**
 * Prevents the browser's default behaviour of navigating to (and thereby
 * opening) a file when it is dropped anywhere on the page.
 *
 * Without this guard a stray file drop unloads the SPA, which fires
 * `beforeunload` and tears down the active connection. This happens on touch
 * devices, where the drop zone is intentionally disabled, as well as on
 * desktop when a file is dropped outside the drop zone.
 *
 * The drop zone of the send panel handles its drops before they bubble up
 * here, so intentional drops there are unaffected by this global guard.
 */
export function usePreventFileDropNavigation(): void {
    useWindowEvent("dragover", preventDefault);
    useWindowEvent("drop", preventDefault);
}

function preventDefault(event: Event) {
    event.preventDefault();
}
