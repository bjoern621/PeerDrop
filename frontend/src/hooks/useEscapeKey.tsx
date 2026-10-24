import { useEffect, useRef } from "react";

/**
 * Calls `onEscape` when Escape is pressed anywhere on the page, wherever the focus sits.
 * Listens only while `active` is true; the latest `onEscape` is called.
 */
export function useEscapeKey(onEscape: () => void, active = true) {
    const latest = useRef(onEscape);

    useEffect(() => {
        latest.current = onEscape;
    });

    useEffect(() => {
        if (!active) {
            return;
        }
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                latest.current();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [active]);
}
