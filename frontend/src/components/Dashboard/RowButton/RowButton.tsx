import { ComponentPropsWithRef, ReactNode } from "react";
import css from "./RowButton.module.scss";
import Tooltip from "../../Tooltip/Tooltip";

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
                className={`${css.rowButton} ${primary ? css.primary : ""}`}
                {...props}
            >
                {children}
            </button>
        </Tooltip>
    );
}
