import { VariantProps } from "class-variance-authority";
import { ReactNode } from "react";
import { Link as RouterLink, LinkProps as RouterLinkProps } from "react-router";
import { buttonVariants } from "./Button";

interface LinkProps
    extends Omit<RouterLinkProps, "className">,
        VariantProps<typeof buttonVariants> {
    children: ReactNode;
    className?: string;
}

export default function Link({
    className,
    color_scheme,
    variant,
    children,
    ...props
}: LinkProps) {
    return (
        <RouterLink
            className={buttonVariants({
                color_scheme,
                variant,
                className,
            })}
            {...props}
        >
            {children}
        </RouterLink>
    );
}
