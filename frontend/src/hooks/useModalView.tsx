import { RefObject, useEffect, useRef } from "react";
import { useEscapeKey } from "./useEscapeKey";

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

/**
 * Calls `onOutsidePress` when a pointer goes down anywhere outside `ref`.
 * Pointer down precedes the click that mounts the element, so the opening press never counts.
 */
function useOutsidePress(
    ref: RefObject<HTMLElement | null>,
    onOutsidePress: () => void,
    active: boolean
) {
    const latest = useRef(onOutsidePress);

    useEffect(() => {
        latest.current = onOutsidePress;
    });

    useEffect(() => {
        if (!active) {
            return;
        }
        const handlePointerDown = (event: PointerEvent) => {
            if (!ref.current?.contains(event.target as Node)) {
                latest.current();
            }
        };
        window.addEventListener("pointerdown", handlePointerDown);
        return () =>
            window.removeEventListener("pointerdown", handlePointerDown);
    }, [ref, active]);
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
