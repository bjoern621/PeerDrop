import { RefObject, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import css from "./SendPanel.module.scss";
import {
    IconPlugConnected as ConnectIcon,
    IconKeyboard as KeyboardIcon,
    IconLoader2 as CheckingIcon,
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
import { useResizeObserver } from "../../hooks/useResizeObserver";
import { useContentHeight } from "../../hooks/useContentHeight";
import { cx } from "class-variance-authority";

interface SendPanelProps {
    recipient: string;
    onRecipientChange: (token: string) => void;
    check: RecipientCheck;
    hint: Hint;
    /** The connection to the server is lost, so no step can be taken. */
    lost: boolean;
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
    wait: CheckingIcon,
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
    const hintTextRef = useRef<HTMLSpanElement>(null);
    const hintTextHeight = useContentHeight(hintTextRef);
    const partsRef = useRef<HTMLDivElement>(null);
    usePublishHeight(hintRef, "--send-hint-height");
    const lockedHint = props.lost
        ? t("send.noConnection")
        : t("dropZone.pickRecipient");

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
                        <StepNumber
                            step={1}
                            active={!props.canWriteText && !props.lost}
                        />
                        {t("send.to")}
                    </span>
                    <RecipientInput
                        value={props.recipient}
                        onChange={props.onRecipientChange}
                        check={props.check}
                    />
                </div>
            </div>

            <div ref={hintRef} role="status" className={cx(css.hint, tone)}>
                <HintIcon
                    aria-hidden
                    className={cx(props.hint.kind === "wait" && css.spinning)}
                />
                <div
                    className={css.hintTextFrame}
                    style={{ height: hintTextHeight }}
                >
                    <span ref={hintTextRef} className={css.hintText}>
                        {props.hint.text}
                    </span>
                </div>
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
                        lockedHint={lockedHint}
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
                        lockedHint={lockedHint}
                    />
                </div>
            </div>
        </section>
    );
}

/** Numbers a step of sending. Lights up while the step is due. */
function StepNumber({ step, active }: { step: number; active: boolean }) {
    return (
        <span className={cx(css.step, active && css.stepActive)} aria-hidden>
            {step}
        </span>
    );
}

/** Keeps the height of `ref`, in px, in the custom property `name` on the root element. */
function usePublishHeight(ref: RefObject<HTMLElement | null>, name: string) {
    useResizeObserver(ref, element =>
        document.documentElement.style.setProperty(
            name,
            `${element.offsetHeight}px`
        )
    );
    useEffect(
        () => () => {
            document.documentElement.style.removeProperty(name);
        },
        [name]
    );
}
