import { RefObject } from "react";
import { useWindowEvent } from "./useWindowEvent";

/**
 * Calls `onOutsidePress` when a pointer goes down anywhere outside `ref` while `active` is true.
 * Pointer down precedes the click that mounts the element, so the opening press never counts.
 */
export function useOutsidePress(
    ref: RefObject<HTMLElement | null>,
    onOutsidePress: () => void,
    active = true
) {
    useWindowEvent(
        "pointerdown",
        event => {
            if (!ref.current?.contains(event.target as Node)) {
                onOutsidePress();
            }
        },
        active
    );
}
