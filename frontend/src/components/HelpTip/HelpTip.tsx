import { ReactNode } from "react";
import { IconHelpCircle as QuestionIcon } from "@tabler/icons-react";
import css from "./HelpTip.module.scss";
import Tooltip from "../Tooltip/Tooltip";

/** Question mark that explains the text beside it on hover. */
export default function HelpTip({
    children,
    hoverable = false,
}: {
    children: ReactNode;
    /** Keeps the tooltip open while hovered, for content with links. */
    hoverable?: boolean;
}) {
    return (
        <Tooltip content={children} hoverable={hoverable}>
            <QuestionIcon className={css.icon} aria-hidden />
        </Tooltip>
    );
}
