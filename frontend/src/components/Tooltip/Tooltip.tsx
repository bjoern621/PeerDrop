import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import css from "./Tooltip.module.scss";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

// Grace period before a hoverable tooltip hides, so the pointer can travel
// from the trigger to the tooltip content.
const HIDE_DELAY_MS = 200;

interface TooltipProps {
    children: ReactNode;
    content: ReactNode;
    position?: TooltipPosition;
    showArrow?: boolean;
    className?: string;
    disabled?: boolean;
    /** Keeps the tooltip open while hovered, so its content can be selected and clicked. */
    hoverable?: boolean;
}

export default function Tooltip({
    children,
    content,
    position = "top",
    showArrow = false,
    className = "",
    disabled = false,
    hoverable = false,
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const hideTimeout = useRef<number | undefined>(undefined);
    const anchorId = useId();

    useEffect(() => () => window.clearTimeout(hideTimeout.current), []);

    const handleMouseEnter = () => {
        window.clearTimeout(hideTimeout.current);
        if (!disabled) {
            setIsVisible(true);
        }
    };

    const handleMouseLeave = () => {
        if (hoverable) {
            hideTimeout.current = window.setTimeout(
                () => setIsVisible(false),
                HIDE_DELAY_MS
            );
        } else {
            setIsVisible(false);
        }
    };

    const tooltipClasses = [
        css.tooltip,
        css[position],
        showArrow ? css.withArrow : "",
        isVisible ? css.visible : "",
        hoverable ? css.hoverable : "",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    const anchorName = `--anchor-${anchorId.replace(/:/g, "")}`;

    return (
        <>
            <div
                id={anchorId}
                className={css.tooltipTrigger}
                style={
                    {
                        anchorName: anchorName,
                    } as React.CSSProperties
                }
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {children}
            </div>
            {createPortal(
                <div
                    className={tooltipClasses}
                    style={
                        {
                            positionAnchor: anchorName,
                        } as React.CSSProperties
                    }
                    data-anchor-id={anchorId}
                    onMouseEnter={hoverable ? handleMouseEnter : undefined}
                    onMouseLeave={hoverable ? handleMouseLeave : undefined}
                >
                    {showArrow && <div className={css.arrow} />}
                    {content}
                </div>,
                document.body
            )}
        </>
    );
}
