import { RefObject, useEffect, useState } from "react";

/**
 * Height of an element in px, kept up to date as its content changes.
 * Set on a wrapper, it lets a CSS transition animate the change.
 * Undefined before the first measurement.
 */
export function useContentHeight(
    ref: RefObject<HTMLElement | null>
): number | undefined {
    const [height, setHeight] = useState<number>();

    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }

        const observer = new ResizeObserver(() =>
            setHeight(element.offsetHeight)
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, [ref]);

    return height;
}
