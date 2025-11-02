import { cva, VariantProps } from "class-variance-authority";
import css from "./Badge.module.scss";
import { ComponentPropsWithoutRef, ReactNode } from "react";

const badgeVariants = cva(css.badge, {
    variants: {
        color_scheme: {
            primary: css.primary,
            secondary: css.secondary,
            neutral: css.neutral,
            success: css.success,
        },
        clickable: {
            true: css.clickable,
            false: "",
        },
        size: {
            s: css.small,
            m: css.medium,
        },
    },
    defaultVariants: {
        color_scheme: "neutral",
        clickable: false,
        size: "s",
    },
});

interface BadgeProps
    extends Omit<ComponentPropsWithoutRef<"button">, "color">,
        VariantProps<typeof badgeVariants> {
    children: ReactNode;
}

export default function Badge({
    className,
    color_scheme,
    clickable,
    size,
    children,
    ...props
}: BadgeProps) {
    const classes = badgeVariants({
        color_scheme,
        clickable,
        size,
        className,
    });

    if (clickable) {
        return (
            <button className={classes} {...props}>
                {children}
            </button>
        );
    }

    return <span className={classes}>{children}</span>;
}
