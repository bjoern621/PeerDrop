import { CSSProperties } from "react";
import css from "./EdgeShadows.module.scss";
import { ScrollShadows } from "../../../hooks/useScrollShadows";

/**
 * Gradients over the top and bottom edge of a scroll box, each shown while more content hides past it.
 * Belongs in the positioned frame around the scroll box.
 */
export default function EdgeShadows({
    shadows,
    className = "",
}: {
    shadows: ScrollShadows;
    className?: string;
}) {
    const style = { "--scrollbar": `${shadows.scrollbar}px` } as CSSProperties;

    return (
        <>
            <div
                className={`${css.shadow} ${css.top} ${shadows.top ? css.visible : ""} ${className}`}
                style={style}
                aria-hidden
            />
            <div
                className={`${css.shadow} ${css.bottom} ${shadows.bottom ? css.visible : ""} ${className}`}
                style={style}
                aria-hidden
            />
        </>
    );
}
