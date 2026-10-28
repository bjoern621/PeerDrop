import { RefObject } from "react";
import { useWindowEvent } from "./useWindowEvent";

/**
 * Calls `onOutsidePress` when a pointer goes down outside an open modal dialog,
 * on its backdrop or on the header that the backdrop leaves uncovered. The
 * inert page hands presses on the header to the root element, past any click
 * handler on the dialog. Pointer down precedes the click that opens a dialog,
 * so the opening press never closes it again.
 */
export function useDialogOutsidePress(
    ref: RefObject<HTMLDialogElement>,
    onOutsidePress: () => void
) {
    useWindowEvent("pointerdown", event => {
        const dialog = ref.current;
        // Presses on the backdrop target the dialog element itself.
        if (
            dialog.open &&
            (event.target === dialog || !dialog.contains(event.target as Node))
        ) {
            onOutsidePress();
        }
    });
}
