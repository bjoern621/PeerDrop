import { RefObject, useEffect } from "react";
import { useEscapeKey } from "./useEscapeKey";
import { useOutsidePress } from "./useOutsidePress";

/**
 * Behaviour of a view that opens over the page, while `active` is true.
 * Escape or a press outside `ref` calls `close`.
 * The page around the view takes no hover or clicks, so a press outside only closes it.
 * The view sets `pointer-events: auto` on itself to stay usable.
 */
export function useModalView(
    ref: RefObject<HTMLElement | null>,
    close: () => void,
    active = true
) {
    useEscapeKey(close, active);
    useOutsidePress(ref, close, active);
    usePagePointerBlock(active);
}

/** Turns off hover and clicks on the whole page. A press then lands on the root element. */
function usePagePointerBlock(active: boolean) {
    useEffect(() => {
        if (!active) {
            return;
        }
        document.body.style.pointerEvents = "none";
        return () => {
            document.body.style.pointerEvents = "";
        };
    }, [active]);
}
