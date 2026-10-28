import { ReactNode } from "react";
import { IconCheck as CheckIcon } from "@tabler/icons-react";
import css from "./DeviceTile.module.scss";
import FakeButton from "../../../FakeButton/FakeButton";
import Tooltip from "../../../Tooltip/Tooltip";
import Spinner from "../../../Spinner/Spinner";
import PopIn, { POP_OUT_MS } from "../../../PopIn/PopIn";
import { useLingering } from "../../../../hooks/useLingering";
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
    const spinning = checking && !lost;
    const showsMark = useLingering(spinning || selected, POP_OUT_MS);
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
            {showsMark && (
                <span className={css.mark}>
                    <Spinner visible={spinning} />
                    <PopIn visible={selected && !spinning}>
                        <CheckIcon />
                    </PopIn>
                </span>
            )}
            {actions && <span className={css.actions}>{actions}</span>}
        </FakeButton>
    );
}
