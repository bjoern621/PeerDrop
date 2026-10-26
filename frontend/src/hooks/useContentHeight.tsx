import { RefObject, useState } from "react";
import { useResizeObserver } from "./useResizeObserver";

/**
 * Height of an element in px, kept up to date as its content changes.
 * Set on a wrapper, it lets a CSS transition animate the change.
 * Undefined before the first measurement.
 */
export function useContentHeight(
    ref: RefObject<HTMLElement | null>
): number | undefined {
    const [height, setHeight] = useState<number>();
    useResizeObserver(ref, element => setHeight(element.offsetHeight));
    return height;
}
