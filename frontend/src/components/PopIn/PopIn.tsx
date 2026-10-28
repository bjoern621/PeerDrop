import { ReactNode } from "react";
import css from "./PopIn.module.scss";
import { cx } from "class-variance-authority";

// Matches the fade-out in PopIn.module.scss.
export const POP_OUT_MS = 200;

/**
 * Slot for one icon that pops in on mount and whenever `visible` turns true, and fades out when it turns false.
 * Keeps its size while hidden, so the layout around it stays in place.
 */
export default function PopIn({
    visible = true,
    className,
    children,
}: {
    visible?: boolean;
    className?: string;
    children: ReactNode;
}) {
    return (
        <span
            className={cx(css.popIn, visible && css.visible, className)}
            aria-hidden
        >
            {children}
        </span>
    );
}
