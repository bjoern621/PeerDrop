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
    /** Classes for the element around `children`, e.g. to let it shrink in a flex row. */
    triggerClassName?: string;
}

export default function Tooltip({
    children,
    content,
    position = "top",
    showArrow = false,
    className = "",
    disabled = false,
    hoverable = false,
    triggerClassName = "",
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

    // A tap fires no mouseleave afterwards, which would leave the tooltip of a
    // pressed button open until the next tap elsewhere.
    const handleClick = (event: React.MouseEvent) => {
        if ((event.target as Element).closest("button, a")) {
            window.clearTimeout(hideTimeout.current);
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

    const arrowClasses = [
        css.arrow,
        css[position],
        isVisible ? css.visible : "",
    ]
        .filter(Boolean)
        .join(" ");

    const anchorName = `--anchor-${anchorId.replace(/:/g, "")}`;

    return (
        <>
            <div
                id={anchorId}
                className={`${css.tooltipTrigger} ${triggerClassName}`}
                style={
                    {
                        anchorName: anchorName,
                    } as React.CSSProperties
                }
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
            >
                {children}
            </div>
            {createPortal(
                <>
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
                        {content}
                    </div>
                    {showArrow && (
                        <div
                            className={arrowClasses}
                            style={
                                {
                                    positionAnchor: anchorName,
                                } as React.CSSProperties
                            }
                        />
                    )}
                </>,
                document.body
            )}
        </>
    );
}
