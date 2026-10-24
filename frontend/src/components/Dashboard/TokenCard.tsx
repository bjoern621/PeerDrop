import { useEffect, useRef, useState } from "react";
import css from "./TokenCard.module.scss";
import {
    IconId as ProfileIcon,
    IconCopy as CopyIcon,
    IconLink as CopyLinkIcon,
    IconCheck as CheckIcon,
} from "@tabler/icons-react";
import errorAsValue from "../../util/ErrorAsValue";
import { getRuntimeEnvVars } from "../../util/RuntimeEnvVars";
import { useOwnToken } from "../../hooks/useOwnToken";

const COPIED_MS = 2000;

export default function TokenCard() {
    const token = useOwnToken();
    const [copied, setCopied] = useState<"token" | "link" | null>(null);
    const copiedTimer = useRef<number | undefined>(undefined);

    useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

    const copy = async (kind: "token" | "link") => {
        if (!token) {
            return;
        }
        const text =
            kind === "token"
                ? token.toUpperCase()
                : `${getRuntimeEnvVars().frontendDomain}/connect?token=${token}`;
        const [, err] = await errorAsValue(navigator.clipboard.writeText(text));
        if (err) {
            console.error("Failed to copy the token:", err);
            return;
        }
        setCopied(kind);
        window.clearTimeout(copiedTimer.current);
        copiedTimer.current = window.setTimeout(
            () => setCopied(null),
            COPIED_MS
        );
    };

    return (
        <section className={css.tokenCard} aria-labelledby="own-token">
            <h2 id="own-token" className={css.heading}>
                <ProfileIcon aria-hidden />
                Dein Token
            </h2>
            <div className={css.tokenBox}>
                {token?.toUpperCase() ?? "_____"}
            </div>
            <div className={css.shareRow}>
                <p className={css.shareText}>Teile diesen Token mit anderen</p>
                <button
                    type="button"
                    className={css.iconButton}
                    disabled={!token}
                    aria-label={
                        copied === "token" ? "Token kopiert" : "Token kopieren"
                    }
                    title={
                        copied === "token" ? "Token kopiert" : "Token kopieren"
                    }
                    onClick={() => void copy("token")}
                >
                    {copied === "token" ? <CheckIcon /> : <CopyIcon />}
                </button>
                <button
                    type="button"
                    className={css.iconButton}
                    disabled={!token}
                    aria-label={
                        copied === "link"
                            ? "Link kopiert"
                            : "Token als Link kopieren"
                    }
                    title={
                        copied === "link"
                            ? "Link kopiert"
                            : "Token als Link kopieren"
                    }
                    onClick={() => void copy("link")}
                >
                    {copied === "link" ? <CheckIcon /> : <CopyLinkIcon />}
                </button>
            </div>
        </section>
    );
}
