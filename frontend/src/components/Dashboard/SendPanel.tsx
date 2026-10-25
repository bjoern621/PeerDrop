import { RefObject } from "react";
import { useTranslation } from "react-i18next";
import css from "./SendPanel.module.scss";
import {
    IconPlugConnected as ConnectIcon,
    IconKeyboard as KeyboardIcon,
    IconClock as ClockIcon,
    IconAlertTriangle as WarningIcon,
    IconAlignLeft as LinesIcon,
} from "@tabler/icons-react";
import RecipientInput, {
    RecipientCheck,
} from "./RecipientInput/RecipientInput";
import TextComposer from "./TextComposer/TextComposer";
import DropZone from "./DropZone/DropZone";
import CardHeading from "./CardHeading/CardHeading";
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
    type: KeyboardIcon,
    pick: LinesIcon,
    wait: ClockIcon,
    warn: WarningIcon,
    err: WarningIcon,
};

export default function SendPanel(props: SendPanelProps) {
    const { t } = useTranslation("dashboard");
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
                <CardHeading
                    id="send-heading"
                    icon={ConnectIcon}
                    tone="primary"
                >
                    {t("send.title")}
                </CardHeading>
                <div className={css.recipient}>
                    <span>{t("send.to")}</span>
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
                    <h3 className={css.partHeading}>{t("send.text")}</h3>
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
                    <h3 className={css.partHeading}>{t("send.files")}</h3>
                    <DropZone
                        recipient={props.filesRecipient}
                        onSelection={props.onSelection}
                    />
                </div>
            </div>
        </section>
    );
}
