import { useEffect, useState } from "react";

const TOUCH_MEDIA_QUERY = "(pointer: coarse)";

/**
 * Detects whether the primary input is touch-based (e.g. phones, tablets).
 * Used to disable desktop-only interactions like drag-and-drop.
 */
export function useIsTouchDevice(): boolean {
    const [isTouchDevice, setIsTouchDevice] = useState(
        () => window.matchMedia(TOUCH_MEDIA_QUERY).matches
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia(TOUCH_MEDIA_QUERY);

        const handleChange = (e: MediaQueryListEvent) => {
            setIsTouchDevice(e.matches);
        };

        mediaQuery.addEventListener("change", handleChange);

        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, []);

    return isTouchDevice;
}
