import { useLayoutEffect, useRef, useState } from "react";
import css from "./TruncatedText.module.scss";
import Tooltip from "../Tooltip/Tooltip";

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

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }
        const measure = () =>
            setTruncated(element.scrollWidth > element.clientWidth);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
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
