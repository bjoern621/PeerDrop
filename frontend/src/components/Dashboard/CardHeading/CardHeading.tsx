import { ReactNode } from "react";
import type { Icon } from "@tabler/icons-react";
import css from "./CardHeading.module.scss";

/** Title of a dashboard card, with its icon. */
export default function CardHeading({
    id,
    icon: HeadingIcon,
    tone,
    className = "",
    children,
}: {
    /** Target of the card's `aria-labelledby`. */
    id: string;
    icon: Icon;
    tone: "primary" | "secondary";
    className?: string;
    children: ReactNode;
}) {
    return (
        <h2 id={id} className={`${css.heading} ${css[tone]} ${className}`}>
            <HeadingIcon aria-hidden />
            {children}
        </h2>
    );
}
