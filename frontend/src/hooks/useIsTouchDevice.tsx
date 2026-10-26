import { COARSE_POINTER_QUERY } from "../util/mediaQueries";
import { useMediaQuery } from "./useMediaQuery";

/**
 * Detects whether the primary input is touch-based (e.g. phones, tablets).
 * Used to disable desktop-only interactions like drag-and-drop.
 */
export function useIsTouchDevice(): boolean {
    return useMediaQuery(COARSE_POINTER_QUERY);
}
