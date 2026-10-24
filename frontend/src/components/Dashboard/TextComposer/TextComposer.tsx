import {
    KeyboardEvent,
    RefObject,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import css from "./TextComposer.module.scss";
import {
    IconSend as SendIcon,
    IconArrowsDiagonal as ExpandIcon,
    IconArrowsDiagonalMinimize2 as CollapseIcon,
} from "@tabler/icons-react";
import { getSizeInHumanReadableFormat } from "../transferFormat";

const BIG_MAX_WIDTH = 840;
const BIG_MAX_HEIGHT = 600;
const GROW_MS = 200;

/** Space kept free below the large field: the phone shows the hint there. */
function bottomReserve(): number {
    return window.matchMedia("(width <= 760px)").matches ? 120 : 16;
}

interface TextComposerProps {
    draft: string;
    onDraftChange: (draft: string) => void;
    canSend: boolean;
    /** Share of the send pause already over, 0..1; null while sending is allowed. */
    pauseProgress: number | null;
    onSend: () => void;
    /** The large field grows inside this element. */
    boundsRef: RefObject<HTMLElement | null>;
}

interface Rect {
    left: number;
    top: number;
    width: number;
    height: number;
}

export default function TextComposer({
    draft,
    onDraftChange,
    canSend,
    pauseProgress,
    onSend,
    boundsRef,
}: TextComposerProps) {
    const fieldRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [overflowing, setOverflowing] = useState(false);
    const [big, setBig] = useState<{ from: Rect; to: Rect } | null>(null);
    const [grown, setGrown] = useState(false);
    const closeTimer = useRef<number | undefined>(undefined);

    useLayoutEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            setOverflowing(textarea.scrollHeight > textarea.clientHeight + 1);
        }
    }, [draft]);

    useEffect(() => () => window.clearTimeout(closeTimer.current), []);

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            if (canSend) {
                onSend();
                closeBig();
            }
        }
    };

    const openBig = () => {
        const field = fieldRef.current?.getBoundingClientRect();
        const bounds = boundsRef.current?.getBoundingClientRect();
        if (!field || !bounds) {
            return;
        }
        const left = field.left - bounds.left;
        const top = field.top - bounds.top;
        window.clearTimeout(closeTimer.current);
        setBig({
            from: { left, top, width: field.width, height: field.height },
            to: {
                left,
                top,
                width: Math.min(BIG_MAX_WIDTH, bounds.right - field.left),
                height: Math.max(
                    field.height,
                    Math.min(
                        BIG_MAX_HEIGHT,
                        bounds.bottom - field.top,
                        window.innerHeight - field.top - bottomReserve()
                    )
                ),
            },
        });
        setGrown(false);
        requestAnimationFrame(() =>
            requestAnimationFrame(() => setGrown(true))
        );
    };

    const closeBig = () => {
        setGrown(false);
        window.clearTimeout(closeTimer.current);
        closeTimer.current = window.setTimeout(() => setBig(null), GROW_MS);
    };

    const lines = draft.length === 0 ? 0 : draft.split("\n").length;
    const meta =
        draft.length === 0
            ? ""
            : `${lines} ${lines === 1 ? "Zeile" : "Zeilen"} · ${getSizeInHumanReadableFormat(new Blob([draft]).size)}`;

    const sendButton = (
        <button
            type="button"
            className={css.send}
            disabled={!canSend}
            title="Strg+Enter"
            aria-busy={pauseProgress !== null}
            onClick={() => {
                onSend();
                closeBig();
            }}
        >
            {pauseProgress !== null && (
                <span
                    className={css.fill}
                    style={{ width: `${Math.round(pauseProgress * 100)}%` }}
                    aria-hidden
                />
            )}
            <span className={css.sendContent}>
                <SendIcon aria-hidden />
                Text senden
            </span>
        </button>
    );

    const rect = big && (grown ? big.to : big.from);

    return (
        <>
            <div ref={fieldRef} className={css.field}>
                <label htmlFor="text-draft" className={css.label}>
                    Text
                </label>
                <textarea
                    id="text-draft"
                    ref={textareaRef}
                    className={css.textarea}
                    value={draft}
                    onChange={event => onDraftChange(event.target.value)}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                    wrap="off"
                    placeholder="Text oder Code einfügen"
                />
                <div
                    className={`${css.fadeBottom} ${overflowing ? css.visible : ""}`}
                    aria-hidden
                />
                <div className={css.bar}>
                    <span className={css.meta}>{meta}</span>
                    <button
                        type="button"
                        className={css.sizeButton}
                        aria-label="Großes Textfeld öffnen"
                        title="Großes Textfeld öffnen"
                        onClick={openBig}
                    >
                        <ExpandIcon aria-hidden />
                    </button>
                    {sendButton}
                </div>
            </div>

            {big && rect && (
                <div
                    className={css.overlay}
                    onClick={event => {
                        if (event.target === event.currentTarget) closeBig();
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Text"
                        className={css.big}
                        style={rect}
                    >
                        <div className={css.bigBody}>
                            <label
                                htmlFor="text-draft-big"
                                className={css.label}
                            >
                                Text
                            </label>
                            <textarea
                                id="text-draft-big"
                                className={css.bigTextarea}
                                value={draft}
                                autoFocus
                                onChange={event =>
                                    onDraftChange(event.target.value)
                                }
                                onKeyDown={event => {
                                    if (event.key === "Escape") {
                                        event.preventDefault();
                                        closeBig();
                                        return;
                                    }
                                    handleKeyDown(event);
                                }}
                                spellCheck={false}
                                wrap="off"
                                placeholder="Text oder Code einfügen"
                            />
                        </div>
                        <div className={css.bar}>
                            <span className={css.meta}>{meta}</span>
                            <button
                                type="button"
                                className={css.sizeButton}
                                aria-label="Textfeld verkleinern"
                                title="Textfeld verkleinern (Esc)"
                                onClick={closeBig}
                            >
                                <CollapseIcon aria-hidden />
                            </button>
                            {sendButton}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
