import { CSSProperties } from "react";
import css from "./StableText.module.scss";

interface StableTextProps {
    text: string;
    fontWeight: number | string;
    className?: string;
    style?: CSSProperties;
}

/**
 * A text component that maintains consistent width regardless of font weight changes.
 * Uses an invisible pseudo-element to reserve space for the heaviest font weight,
 * preventing layout shift when the font weight changes (e.g., on hover or active state).
 */
export default function StableText({
    text,
    fontWeight,
    className = "",
    style,
}: StableTextProps) {
    return (
        <span
            className={`${css.stableText} ${className}`}
            style={{ "--font-weight": fontWeight, ...style } as CSSProperties}
            data-text={text}
        />
    );
}
