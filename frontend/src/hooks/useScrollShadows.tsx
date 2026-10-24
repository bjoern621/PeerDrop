import { RefObject, useEffect, useState } from "react";

export interface ScrollShadows {
    top: boolean;
    bottom: boolean;
    /** Width of a vertical scrollbar in px, so a shadow can leave it uncovered. */
    scrollbar: number;
}

/** Whether more content hides above or below the visible part of an element. */
export function useScrollShadows(
    ref: RefObject<HTMLElement | null>
): ScrollShadows {
    const [shadows, setShadows] = useState<ScrollShadows>({
        top: false,
        bottom: false,
        scrollbar: 0,
    });

    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }

        const measure = () => {
            const next: ScrollShadows = {
                top: element.scrollTop > 1,
                bottom:
                    element.scrollTop + element.clientHeight <
                    element.scrollHeight - 1,
                scrollbar: element.offsetWidth - element.clientWidth,
            };
            setShadows(previous =>
                previous.top === next.top &&
                previous.bottom === next.bottom &&
                previous.scrollbar === next.scrollbar
                    ? previous
                    : next
            );
        };

        measure();
        element.addEventListener("scroll", measure, { passive: true });
        const resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(element);
        const mutationObserver = new MutationObserver(measure);
        mutationObserver.observe(element, { childList: true, subtree: true });

        return () => {
            element.removeEventListener("scroll", measure);
            resizeObserver.disconnect();
            mutationObserver.disconnect();
        };
        // exhaustive-deps-exclude [ref]
    }, []);

    return shadows;
}
