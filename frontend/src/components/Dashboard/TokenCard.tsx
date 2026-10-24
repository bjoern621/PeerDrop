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
import IconButton from "../IconButton/IconButton";
import CardHeading from "./CardHeading/CardHeading";

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

    const tokenLabel = copied === "token" ? "Token kopiert" : "Token kopieren";
    const linkLabel =
        copied === "link" ? "Link kopiert" : "Token als Link kopieren";

    return (
        <section className={css.tokenCard} aria-labelledby="own-token">
            <CardHeading id="own-token" icon={ProfileIcon} tone="secondary">
                Dein Token
            </CardHeading>
            <div className={css.tokenBox}>
                {token?.toUpperCase() ?? "_____"}
            </div>
            <div className={css.shareRow}>
                <p className={css.shareText}>Teile diesen Token mit anderen</p>
                <IconButton
                    label={tokenLabel}
                    disabled={!token}
                    onClick={() => void copy("token")}
                >
                    {copied === "token" ? <CheckIcon /> : <CopyIcon />}
                </IconButton>
                <IconButton
                    label={linkLabel}
                    disabled={!token}
                    onClick={() => void copy("link")}
                >
                    {copied === "link" ? <CheckIcon /> : <CopyLinkIcon />}
                </IconButton>
            </div>
        </section>
    );
}
