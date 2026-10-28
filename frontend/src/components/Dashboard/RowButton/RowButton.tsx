import { ComponentPropsWithRef, ReactNode } from "react";
import css from "./RowButton.module.scss";
import Tooltip from "../../Tooltip/Tooltip";
import { cx } from "class-variance-authority";

interface RowButtonProps extends ComponentPropsWithRef<"button"> {
    tooltip: ReactNode;
    /** Fills the button for the one action a row asks for. */
    primary?: boolean;
    children: ReactNode;
}

/** Small uppercase text button in a list row, e.g. SPEICHERN. */
export default function RowButton({
    tooltip,
    primary = false,
    children,
    ...props
}: RowButtonProps) {
    return (
        <Tooltip content={tooltip}>
            <button
                type="button"
                className={cx(css.rowButton, primary && css.primary)}
                {...props}
            >
                {children}
            </button>
        </Tooltip>
    );
}
