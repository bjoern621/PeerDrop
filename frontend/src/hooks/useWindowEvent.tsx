import { useEffect } from "react";
import { useLatest } from "./useLatest";

/** Calls the latest `handler` for every `type` event on the window while `active` is true. */
export function useWindowEvent<K extends keyof WindowEventMap>(
    type: K,
    handler: (event: WindowEventMap[K]) => void,
    active = true
) {
    const latest = useLatest(handler);

    useEffect(() => {
        if (!active) {
            return;
        }
        const listener = (event: WindowEventMap[K]) => latest.current(event);
        window.addEventListener(type, listener);
        return () => window.removeEventListener(type, listener);
    }, [type, active, latest]);
}
