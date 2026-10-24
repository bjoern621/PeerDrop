import { ComponentPropsWithRef, ReactNode } from "react";
import css from "./IconButton.module.scss";
import Tooltip from "../Tooltip/Tooltip";

interface IconButtonProps
    extends Omit<ComponentPropsWithRef<"button">, "children"> {
    /** Accessible name, shown as tooltip unless `tooltip` is given. */
    label: string;
    tooltip?: ReactNode;
    /** `ghost`: round, no background until hovered. `badge`: small square on a tint, for list rows. */
    variant?: "ghost" | "badge";
    /** Edge of a ghost button: `l` 44px, `m` 32px. */
    size?: "m" | "l";
    tone?: "neutral" | "error";
    children: ReactNode;
}

/** Button that shows only an icon. */
export default function IconButton({
    label,
    tooltip,
    variant = "ghost",
    size = "l",
    tone = "neutral",
    className = "",
    children,
    ...props
}: IconButtonProps) {
    const classes = [
        css.iconButton,
        css[variant],
        variant === "ghost" ? css[size] : "",
        tone === "error" ? css.error : "",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <Tooltip content={tooltip ?? label}>
            <button
                type="button"
                className={classes}
                aria-label={label}
                {...props}
            >
                {children}
            </button>
        </Tooltip>
    );
}
