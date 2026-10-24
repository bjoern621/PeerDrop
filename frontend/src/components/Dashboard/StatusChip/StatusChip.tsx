import { ReactNode } from "react";
import css from "./StatusChip.module.scss";
import Tooltip from "../../Tooltip/Tooltip";

/** Colored state of a list row, e.g. Fertig!. */
export default function StatusChip({
    tone,
    tooltip,
    children,
}: {
    tone: "neutral" | "success" | "warning" | "error";
    tooltip?: ReactNode;
    children: ReactNode;
}) {
    const chip = <span className={`${css.chip} ${css[tone]}`}>{children}</span>;
    return tooltip ? <Tooltip content={tooltip}>{chip}</Tooltip> : chip;
}
