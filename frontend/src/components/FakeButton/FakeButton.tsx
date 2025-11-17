import {
    ComponentPropsWithoutRef,
    ReactNode,
    KeyboardEvent,
    MouseEvent,
} from "react";
import styles from "./FakeButton.module.scss";

interface FakeButtonProps
    extends Omit<ComponentPropsWithoutRef<"div">, "role"> {
    children: ReactNode;
    disabled?: boolean;
    onClick?: (e: MouseEvent<HTMLDivElement>) => void;
    onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
}

export default function FakeButton({
    children,
    disabled = false,
    onClick,
    onKeyDown,
    className,
    ...props
}: FakeButtonProps) {
    const handleClick = (e: MouseEvent<HTMLDivElement>) => {
        if (!disabled && onClick) {
            onClick(e);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled && onClick) {
            e.preventDefault();
            onClick(e as unknown as MouseEvent<HTMLDivElement>);
        }
        if (onKeyDown) {
            onKeyDown(e);
        }
    };

    return (
        <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled || undefined}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={`${styles.fakeButton} ${className || ""}`}
            {...props}
        >
            {children}
        </div>
    );
}
