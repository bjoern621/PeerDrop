import { RefObject, useEffect, useRef } from "react";
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
    canWriteText: boolean;
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
    const hintRef = useRef<HTMLDivElement>(null);
    const partsRef = useRef<HTMLDivElement>(null);
    usePublishHeight(hintRef, "--send-hint-height");

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
                    <span className={css.label}>
                        <StepNumber step={1} active={!props.canWriteText} />
                        {t("send.to")}
                    </span>
                    <RecipientInput
                        value={props.recipient}
                        onChange={props.onRecipientChange}
                        check={props.check}
                    />
                </div>
            </div>

            <div ref={hintRef} role="status" className={`${css.hint} ${tone}`}>
                <HintIcon aria-hidden />
                <span>{props.hint.text}</span>
            </div>

            <div ref={partsRef} className={css.parts}>
                <div className={css.part}>
                    <h3 className={css.partHeading}>
                        <StepNumber step={2} active={props.canWriteText} />
                        {t("send.text")}
                    </h3>
                    <TextComposer
                        draft={props.draft}
                        onDraftChange={props.onDraftChange}
                        disabled={!props.canWriteText}
                        canSend={props.canSendText}
                        pauseProgress={props.pauseProgress}
                        onSend={props.onSendText}
                        boundsRef={props.boundsRef}
                        widthRef={partsRef}
                    />
                </div>
                <div className={css.part}>
                    <h3 className={css.partHeading}>
                        <StepNumber step={2} active={props.canWriteText} />
                        {t("send.files")}
                    </h3>
                    <DropZone
                        recipient={props.filesRecipient}
                        onSelection={props.onSelection}
                    />
                </div>
            </div>
        </section>
    );
}

/** Numbers a step of sending. Lights up while the step is due. */
function StepNumber({ step, active }: { step: number; active: boolean }) {
    return (
        <span
            className={`${css.step} ${active ? css.stepActive : ""}`}
            aria-hidden
        >
            {step}
        </span>
    );
}

/** Keeps the height of `ref`, in px, in the custom property `name` on the root element. */
function usePublishHeight(ref: RefObject<HTMLElement | null>, name: string) {
    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }

        const root = document.documentElement;
        const observer = new ResizeObserver(() =>
            root.style.setProperty(name, `${element.offsetHeight}px`)
        );
        observer.observe(element);
        return () => {
            observer.disconnect();
            root.style.removeProperty(name);
        };
    }, [ref, name]);
}
