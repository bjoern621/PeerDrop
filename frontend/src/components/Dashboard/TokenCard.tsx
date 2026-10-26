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
import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";
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
    const { isLoggedIn } = useAuth();
    const resetWebsocket = useResetWebsocket();
    const [editing, setEditing] = useState(false);
    const [editedToken, setEditedToken] = useState("");
    const [inUseToken, setInUseToken] = useState<string | null>(null);

    const startEditing = () => {
        setEditedToken(token ?? "");
        setInUseToken(null);
        setEditing(true);
    };

    const commitEdit = async () => {
        setEditing(false);
        if (
            editedToken.length !== CLIENT_TOKEN_LENGTH ||
            editedToken === token
        ) {
            return;
        }

        const result = await AuthService.setChosenClientToken(editedToken);
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
            {editing ? (
                <input
                    className={cx(css.tokenBox, css.tokenInput)}
                    value={editedToken}
                    maxLength={CLIENT_TOKEN_LENGTH}
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    aria-label={t("token.newToken")}
                    onChange={e =>
                        setEditedToken(chosenTokenFromInput(e.target.value))
                    }
                    onKeyDown={e => {
                        if (e.key === "Enter") {
                            void commitEdit();
                        } else if (e.key === "Escape") {
                            setEditing(false);
                        }
                    }}
                    onBlur={() => void commitEdit()}
                />
            ) : (
                <div className={css.tokenBox}>
                    {token ? displayToken(token) : "_____"}
                </div>
            )}
            <div className={css.shareRow}>
                <p className={css.shareText}>
                    {shareText(t, editing, inUseToken, token)}
                </p>
                <CopyIconButton
                    text={token && displayToken(token)}
                    label={t("token.copy")}
                    copiedLabel={t("token.copied")}
                    icon={<CopyIcon />}
                />
                <CopyIconButton
                    text={
                        token &&
                        `${getRuntimeEnvVars().frontendDomain}/connect?token=${token}`
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
