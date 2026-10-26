import { useLayoutEffect, useRef, useState } from "react";
import css from "./TruncatedText.module.scss";
import Tooltip from "../Tooltip/Tooltip";
import { useResizeObserver } from "../../hooks/useResizeObserver";

/** One line of text that ends in an ellipsis when too long and then shows itself in full on hover. */
export default function TruncatedText({
    children,
    className = "",
}: {
    children: string;
    /** Classes for the outer element, which takes part in the parent's layout. */
    className?: string;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const [truncated, setTruncated] = useState(false);

    useResizeObserver(ref, element => setTruncated(isTruncated(element)));
    // New text can overflow without a size change of the element.
    useLayoutEffect(() => {
        if (ref.current) {
            setTruncated(isTruncated(ref.current));
        }
    }, [children]);

    return (
        <Tooltip
            content={children}
            disabled={!truncated}
            triggerClassName={`${css.trigger} ${className}`}
        >
            <span ref={ref} className={css.text}>
                {children}
            </span>
        </Tooltip>
    );
}

function isTruncated(element: HTMLElement) {
    return element.scrollWidth > element.clientWidth;
}
