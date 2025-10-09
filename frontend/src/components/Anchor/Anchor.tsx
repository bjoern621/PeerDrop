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
    },
    defaultVariants: {
        underline: "dashed",
    },
});

interface AnchorProps extends LinkProps, VariantProps<typeof anchorVariants> {
    children: ReactNode;
}

export default function Anchor({ underline, children, ...props }: AnchorProps) {
    return (
        <Link
            className={anchorVariants({
                underline,
            })}
            {...props}
        >
            {children}
        </Link>
    );
}
