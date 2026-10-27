import { ReactNode, useState } from "react";
import { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import css from "./TokenCard.module.scss";
import {
    IconId as ProfileIcon,
    IconCopy as CopyIcon,
    IconLink as CopyLinkIcon,
    IconCheck as CheckIcon,
    IconPencil as EditIcon,
} from "@tabler/icons-react";
import { getRuntimeEnvVars } from "../../util/RuntimeEnvVars";
import { useOwnToken } from "../../hooks/useOwnToken";
import { useServerConnection } from "../../hooks/useServerConnection";
import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";
import { useInlineEdit } from "../../hooks/useInlineEdit";
import { useAuth } from "../../context/AuthContext";
import { useResetWebsocket } from "../../context/connection/ResetContext";
import { AuthService } from "../../services/AuthService";
import {
    displayToken,
    normalizeClientToken,
} from "../../services/WebSocketService";
import {
    CLIENT_TOKEN_LENGTH,
    CLIENT_TOKEN_CHARACTERS,
} from "../../util/Constants";
import IconButton from "../IconButton/IconButton";
import CardHeading from "./CardHeading/CardHeading";
import { cx } from "class-variance-authority";

export default function TokenCard() {
    const { t } = useTranslation("dashboard");
    const token = useOwnToken();
    const lost = useServerConnection() === "lost";
    // Nobody finds a lost token, so it stays out of the clipboard.
    const shareableToken = lost ? undefined : token;
    const { isLoggedIn } = useAuth();
    const resetWebsocket = useResetWebsocket();
    const [inUseToken, setInUseToken] = useState<string | null>(null);

    const chooseToken = async (chosen: string) => {
        if (chosen.length !== CLIENT_TOKEN_LENGTH || chosen === token) {
            return;
        }

        const result = await AuthService.setChosenClientToken(chosen);
        if (!result) {
            return;
        }

        if (result.inUse) {
            setInUseToken(result.token);
            return;
        }

        // The server assigns the chosen token on the next connect
        resetWebsocket();
    };

    const tokenEdit = useInlineEdit(draft => void chooseToken(draft));

    const startEditing = () => {
        setInUseToken(null);
        tokenEdit.start(token ?? "");
    };

    return (
        <section className={css.tokenCard} aria-labelledby="own-token">
            <div className={css.header}>
                <CardHeading id="own-token" icon={ProfileIcon} tone="secondary">
                    {t("token.title")}
                </CardHeading>
                {isLoggedIn && (
                    <IconButton
                        label={t("token.change")}
                        size="m"
                        onClick={startEditing}
                    >
                        <EditIcon aria-hidden />
                    </IconButton>
                )}
            </div>
            {tokenEdit.editing ? (
                <input
                    {...tokenEdit.fieldProps}
                    className={cx(css.tokenBox, css.tokenInput)}
                    maxLength={CLIENT_TOKEN_LENGTH}
                    autoComplete="off"
                    spellCheck={false}
                    aria-label={t("token.newToken")}
                    onChange={e =>
                        tokenEdit.setDraft(chosenTokenFromInput(e.target.value))
                    }
                />
            ) : (
                <div className={cx(css.tokenBox, lost && css.lost)}>
                    {token ? displayToken(token) : "_____"}
                </div>
            )}
            <div className={css.shareRow}>
                <p
                    role="status"
                    className={cx(css.shareText, lost && css.lostText)}
                >
                    {lost
                        ? t("token.lost")
                        : shareText(t, tokenEdit.editing, inUseToken, token)}
                </p>
                <CopyIconButton
                    text={shareableToken && displayToken(shareableToken)}
                    label={t("token.copy")}
                    copiedLabel={t("token.copied")}
                    icon={<CopyIcon />}
                />
                <CopyIconButton
                    text={
                        shareableToken &&
                        `${getRuntimeEnvVars().frontendDomain}/connect?token=${shareableToken}`
                    }
                    label={t("token.copyLink")}
                    copiedLabel={t("token.linkCopied")}
                    icon={<CopyLinkIcon />}
                />
            </div>
        </section>
    );
}

/** Keeps the token characters of the input, lowercased, up to the token length. */
function chosenTokenFromInput(value: string): string {
    return [...normalizeClientToken(value)]
        .filter(character => CLIENT_TOKEN_CHARACTERS.includes(character))
        .join("")
        .slice(0, CLIENT_TOKEN_LENGTH);
}

function shareText(
    t: TFunction<"dashboard">,
    editing: boolean,
    inUseToken: string | null,
    token: string | undefined
): string {
    if (editing) {
        return t("token.pickCharacters", { length: CLIENT_TOKEN_LENGTH });
    }
    if (inUseToken && inUseToken !== token) {
        return t("token.inUse", { token: displayToken(inUseToken) });
    }
    return t("token.share");
}

/** Copies `text` and shows a check mark for a moment; disabled while there is no text. */
function CopyIconButton({
    text,
    label,
    copiedLabel,
    icon,
}: {
    text: string | undefined;
    label: string;
    copiedLabel: string;
    icon: ReactNode;
}) {
    const [copied, copy] = useCopyToClipboard();

    return (
        <IconButton
            label={copied ? copiedLabel : label}
            disabled={!text}
            onClick={() => text && void copy(text)}
        >
            {copied ? <CheckIcon /> : icon}
        </IconButton>
    );
}
