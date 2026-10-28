import { IconLoader as LoaderIcon } from "@tabler/icons-react";
import css from "./Spinner.module.scss";
import { cx } from "class-variance-authority";

/**
 * Turning loader icon in the current text color. Pops in on mount and whenever `visible` turns true.
 * Keeps its size while hidden, so the layout around it stays in place.
 */
export default function Spinner({
    visible = true,
    className,
}: {
    visible?: boolean;
    className?: string;
}) {
    return (
        <span
            className={cx(css.spinner, visible && css.visible, className)}
            aria-hidden
        >
            <LoaderIcon />
        </span>
    );
}
