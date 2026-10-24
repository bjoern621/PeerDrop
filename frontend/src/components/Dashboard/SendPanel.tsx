import { RefObject } from "react";
import css from "./SendPanel.module.scss";
import ConnectIcon from "../../assets/icons8-connect.svg?react";
import ArrowLeftIcon from "../../assets/actions/arrow-left.svg?react";
import KeyboardIcon from "../../assets/actions/keyboard.svg?react";
import SendIcon from "../../assets/actions/send.svg?react";
import ClockIcon from "../../assets/actions/clock.svg?react";
import WarningIcon from "../../assets/actions/warning.svg?react";
import LinesIcon from "../../assets/actions/lines.svg?react";
import RecipientInput, {
    RecipientCheck,
} from "./RecipientInput/RecipientInput";
import TextComposer from "./TextComposer/TextComposer";
import DropZone from "./DropZone/DropZone";
import { Hint } from "./nextStep";
import { ShareSelection } from "../../types/transfer/ShareSelection";

interface SendPanelProps {
    recipient: string;
    onRecipientChange: (token: string) => void;
    check: RecipientCheck;
    hint: Hint;
    draft: string;
    onDraftChange: (draft: string) => void;
    canSendText: boolean;
    pauseProgress: number | null;
    onSendText: () => void;
    /** Uppercase token of a recipient that files can go to, or null. */
    filesRecipient: string | null;
    onSelection: (selection: ShareSelection) => void;
    /** The large text field grows inside this element. */
    boundsRef: RefObject<HTMLElement | null>;
}

const HINT_ICONS = {
    left: ArrowLeftIcon,
    type: KeyboardIcon,
    pick: LinesIcon,
    send: SendIcon,
    wait: ClockIcon,
    warn: WarningIcon,
    err: WarningIcon,
};

export default function SendPanel(props: SendPanelProps) {
    const HintIcon = HINT_ICONS[props.hint.kind];
    const tone =
        props.hint.kind === "warn"
            ? css.warn
            : props.hint.kind === "err"
              ? css.err
              : css.info;

    return (
        <section className={css.panel} aria-labelledby="send-heading">
            <div className={css.header}>
                <h2 id="send-heading" className={css.heading}>
                    <ConnectIcon aria-hidden />
                    Senden
                </h2>
                <div className={css.recipient}>
                    <span>An</span>
                    <RecipientInput
                        value={props.recipient}
                        onChange={props.onRecipientChange}
                        check={props.check}
                    />
                </div>
            </div>

            <div role="status" className={`${css.hint} ${tone}`}>
                <HintIcon aria-hidden />
                <span>{props.hint.text}</span>
            </div>

            <div className={css.parts}>
                <div className={css.part}>
                    <h3 className={css.partHeading}>Text</h3>
                    <TextComposer
                        draft={props.draft}
                        onDraftChange={props.onDraftChange}
                        canSend={props.canSendText}
                        pauseProgress={props.pauseProgress}
                        onSend={props.onSendText}
                        boundsRef={props.boundsRef}
                    />
                </div>
                <div className={css.part}>
                    <h3 className={css.partHeading}>Dateien und Ordner</h3>
                    <DropZone
                        recipient={props.filesRecipient}
                        onSelection={props.onSelection}
                    />
                </div>
            </div>
        </section>
    );
}
