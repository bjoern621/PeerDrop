import { ReactNode } from "react";
import { IconCheck as CheckIcon } from "@tabler/icons-react";
import css from "./DeviceTile.module.scss";
import FakeButton from "../../../FakeButton/FakeButton";
import Tooltip from "../../../Tooltip/Tooltip";

interface DeviceTileProps {
    online: boolean;
    /** Explains the status dot on hover. */
    statusTooltip?: ReactNode;
    selected: boolean;
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
    disabled = false,
    onSelect,
    actions,
    children,
}: DeviceTileProps) {
    const dot = (
        <span
            className={`${css.status} ${online ? css.online : css.offline}`}
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
            {selected && <CheckIcon className={css.check} aria-hidden />}
            {actions && <span className={css.actions}>{actions}</span>}
        </FakeButton>
    );
}
