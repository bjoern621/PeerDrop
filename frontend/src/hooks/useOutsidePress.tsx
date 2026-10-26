import { RefObject, useEffect, useRef } from "react";

/**
 * Calls `onOutsidePress` when a pointer goes down anywhere outside `ref`.
 * Pointer down precedes the click that mounts the element, so the opening press never counts.
 * The latest `onOutsidePress` is called.
 */
export function useOutsidePress(
    ref: RefObject<HTMLElement | null>,
    onOutsidePress: () => void
) {
    const latest = useRef(onOutsidePress);

    useEffect(() => {
        latest.current = onOutsidePress;
    });

    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            if (!ref.current?.contains(event.target as Node)) {
                latest.current();
            }
        };
        window.addEventListener("pointerdown", handlePointerDown);
        return () =>
            window.removeEventListener("pointerdown", handlePointerDown);
    }, [ref]);
}
