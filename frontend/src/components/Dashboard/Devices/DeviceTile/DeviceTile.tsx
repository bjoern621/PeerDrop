import { ReactNode } from "react";
import { IconCheck as CheckIcon } from "@tabler/icons-react";
import css from "./DeviceTile.module.scss";
import FakeButton from "../../../FakeButton/FakeButton";
import Tooltip from "../../../Tooltip/Tooltip";
import Spinner from "../../../Spinner/Spinner";
import { cx } from "class-variance-authority";
import { useServerConnection } from "../../../../hooks/useServerConnection";

interface DeviceTileProps {
    online: boolean;
    /** Explains the status dot on hover. */
    statusTooltip?: ReactNode;
    selected: boolean;
    /** Shows a spinner in place of the check mark. */
    checking?: boolean;
    disabled?: boolean;
    onSelect: () => void;
    /** Buttons at the end of the tile, e.g. rename. */
    actions?: ReactNode;
    children: ReactNode;
}

/** Device to pick as recipient with one click. */
export default function DeviceTile({
    online,
    statusTooltip,
    selected,
    checking = false,
    disabled = false,
    onSelect,
    actions,
    children,
}: DeviceTileProps) {
    // Without the server, the last known status may be stale.
    const lost = useServerConnection() === "lost";
    const dot = (
        <span
            className={cx(
                css.status,
                lost ? css.unknown : online ? css.online : css.offline
            )}
            aria-hidden
        />
    );

    return (
        <FakeButton
            className={css.tile}
            aria-pressed={selected}
            disabled={disabled}
            onClick={onSelect}
        >
            {statusTooltip ? (
                <Tooltip content={statusTooltip} showArrow hoverable>
                    {dot}
                </Tooltip>
            ) : (
                dot
            )}
            <span className={css.content}>{children}</span>
            {checking && !lost ? (
                <Spinner />
            ) : (
                selected && <CheckIcon className={css.check} aria-hidden />
            )}
            {actions && <span className={css.actions}>{actions}</span>}
        </FakeButton>
    );
}
