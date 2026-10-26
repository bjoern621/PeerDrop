import { RefObject, useEffect } from "react";
import { useLatest } from "./useLatest";

/** Calls the latest `onResize` with the element of `ref` once it mounts and whenever its size changes. */
export function useResizeObserver<T extends HTMLElement>(
    ref: RefObject<T | null>,
    onResize: (element: T) => void
) {
    const latest = useLatest(onResize);

    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }

        const observer = new ResizeObserver(() => latest.current(element));
        observer.observe(element);
        return () => observer.disconnect();
    }, [ref, latest]);
}
