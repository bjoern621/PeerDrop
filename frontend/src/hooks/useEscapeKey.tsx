import { useWindowEvent } from "./useWindowEvent";

/**
 * Calls `onEscape` when Escape is pressed anywhere on the page, wherever the focus sits.
 * Listens only while `active` is true; the latest `onEscape` is called.
 */
export function useEscapeKey(onEscape: () => void, active = true) {
    useWindowEvent(
        "keydown",
        event => {
            if (event.key === "Escape") {
                event.preventDefault();
                onEscape();
            }
        },
        active
    );
}
