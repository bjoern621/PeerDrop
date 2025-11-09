import { ReactNode, useId, useState } from "react";
import { createPortal } from "react-dom";
import css from "./Tooltip.module.scss";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TooltipProps {
    children: ReactNode;
    content: ReactNode;
    position?: TooltipPosition;
    showArrow?: boolean;
    className?: string;
    disabled?: boolean;
}

export default function Tooltip({
    children,
    content,
    position = "top",
    showArrow = false,
    className = "",
    disabled = false,
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const anchorId = useId();

    const handleMouseEnter = () => {
        if (!disabled) {
            setIsVisible(true);
        }
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
    };

    const tooltipClasses = [
        css.tooltip,
        css[position],
        showArrow ? css.withArrow : "",
        isVisible ? css.visible : "",
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
                >
                    {showArrow && <div className={css.arrow} />}
                    {content}
                </div>,
                document.body
            )}
        </>
    );
}
