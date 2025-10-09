/* eslint-disable react-refresh/only-export-components */
import { cva, VariantProps } from "class-variance-authority";
import css from "./Button.module.scss";
import { ComponentPropsWithoutRef, ReactNode } from "react";

export const buttonVariants = cva(css.button, {
    variants: {
        color_scheme: {
            primary: css.primary,
            secondary: css.secondary,
        },
        variant: {
            filled: css.filled,
            outline: css.outline,
        },
    },
    defaultVariants: {
        color_scheme: "primary",
        variant: "filled",
    },
});

interface ButtonProps
    extends ComponentPropsWithoutRef<"button">,
        VariantProps<typeof buttonVariants> {
    children: ReactNode;
}

export default function Button({
    className,
    color_scheme,
    variant,
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            className={buttonVariants({
                color_scheme,
                variant,
                className,
            })}
            {...props}
        >
            {children}
        </button>
    );
}
