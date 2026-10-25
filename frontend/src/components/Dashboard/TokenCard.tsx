import { ReactNode, useState } from "react";
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
import { normalizeClientToken } from "../../services/WebSocketService";
import {
    CLIENT_TOKEN_LENGTH,
    CLIENT_TOKEN_LETTERS,
} from "../../util/Constants";
import IconButton from "../IconButton/IconButton";
import CardHeading from "./CardHeading/CardHeading";

export default function TokenCard() {
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
                    Dein Token
                </CardHeading>
                {isLoggedIn && (
                    <IconButton
                        label="Token ändern"
                        size="m"
                        onClick={startEditing}
                    >
                        <EditIcon aria-hidden />
                    </IconButton>
                )}
            </div>
            {editing ? (
                <input
                    className={`${css.tokenBox} ${css.tokenInput}`}
                    value={editedToken}
                    maxLength={CLIENT_TOKEN_LENGTH}
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Neuer Token"
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
                    {token?.toUpperCase() ?? "_____"}
                </div>
            )}
            <div className={css.shareRow}>
                <p className={css.shareText}>
                    {shareText(editing, inUseToken, token)}
                </p>
                <CopyIconButton
                    text={token?.toUpperCase()}
                    label="Token kopieren"
                    copiedLabel="Token kopiert"
                    icon={<CopyIcon />}
                />
                <CopyIconButton
                    text={
                        token &&
                        `${getRuntimeEnvVars().frontendDomain}/connect?token=${token}`
                    }
                    label="Token als Link kopieren"
                    copiedLabel="Link kopiert"
                    icon={<CopyLinkIcon />}
                />
            </div>
        </section>
    );
}

/** Keeps the token letters of the input, lowercased, up to the token length. */
function chosenTokenFromInput(value: string): string {
    return [...normalizeClientToken(value)]
        .filter(letter => CLIENT_TOKEN_LETTERS.includes(letter))
        .join("")
        .slice(0, CLIENT_TOKEN_LENGTH);
}

function shareText(
    editing: boolean,
    inUseToken: string | null,
    token: string | undefined
): string {
    if (editing) {
        return `Wähle ${CLIENT_TOKEN_LENGTH} Buchstaben aus BDFGHJKLMNPRSTVZ und AIOU.`;
    }
    if (inUseToken && inUseToken !== token) {
        return `${inUseToken.toUpperCase()} ist gerade belegt. Lade die Seite später neu, um den Token zu bekommen.`;
    }
    return "Teile diesen Token mit anderen";
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
