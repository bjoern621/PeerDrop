import { cva, VariantProps } from "class-variance-authority";
import { ReactNode } from "react";
import css from "./Anchor.module.scss";
import { Link, LinkProps } from "react-router";

const anchorVariants = cva(css.anchor, {
    variants: {
        underline: {
            none: css.noUnderline,
            dashed: css.dashedUnderline,
            solid: css.solidUnderline,
        },
        hover: {
            none: css.noHover,
            dashed: css.dashedHover,
            solid: css.solidHover,
        },
    },
    defaultVariants: {
        underline: "dashed",
        hover: "solid",
    },
});

interface AnchorProps extends LinkProps, VariantProps<typeof anchorVariants> {
    children: ReactNode;
    className?: string;
}

export default function Anchor({
    underline,
    hover,
    children,
    className,
    ...props
}: AnchorProps) {
    return (
        <Link
            className={`${anchorVariants({
                underline,
                hover,
            })} ${className || ""}`}
            {...props}
        >
            {children}
        </Link>
    );
}
