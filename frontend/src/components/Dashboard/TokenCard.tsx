import { ReactNode } from "react";
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
import useSettings from "../../hooks/useSettings";
import { useResetWebsocket } from "../../context/connection/ResetContext";
import { updateSettings } from "../../services/SettingsStore";
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
    const connection = useServerConnection();
    const lost = connection === "lost";
    const { requestedToken } = useSettings();
    const resetWebsocket = useResetWebsocket();
    // Waits for the open connection, since the old token stays on screen while a new one is on its way.
    const takenToken =
        connection === "open" && requestedToken !== token
            ? requestedToken
            : null;

    const requestToken = (requested: string) => {
        if (requested.length !== CLIENT_TOKEN_LENGTH || requested === token) {
            return;
        }
        updateSettings({ requestedToken: requested });
        resetWebsocket(requested);
    };

    const tokenEdit = useInlineEdit(requestToken);

    const startEditing = () => {
        tokenEdit.start(token ?? "");
    };

    return (
        <section className={css.tokenCard} aria-labelledby="own-token">
            <div className={css.header}>
                <CardHeading id="own-token" icon={ProfileIcon} tone="secondary">
                    {t("token.title")}
                </CardHeading>
                <IconButton
                    label={t("token.change")}
                    size="m"
                    onClick={startEditing}
                >
                    <EditIcon aria-hidden />
                </IconButton>
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
                <p className={css.shareText}>
                    {shareText(t, tokenEdit.editing, takenToken)}
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
    takenToken: string | null
): string {
    if (editing) {
        return t("token.pickCharacters", { length: CLIENT_TOKEN_LENGTH });
    }
    if (takenToken) {
        return t("token.inUse", { token: displayToken(takenToken) });
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
