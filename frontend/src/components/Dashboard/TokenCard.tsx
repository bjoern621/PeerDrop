import { ReactNode } from "react";
import css from "./TokenCard.module.scss";
import {
    IconId as ProfileIcon,
    IconCopy as CopyIcon,
    IconLink as CopyLinkIcon,
    IconCheck as CheckIcon,
} from "@tabler/icons-react";
import { getRuntimeEnvVars } from "../../util/RuntimeEnvVars";
import { useOwnToken } from "../../hooks/useOwnToken";
import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";
import IconButton from "../IconButton/IconButton";
import CardHeading from "./CardHeading/CardHeading";

export default function TokenCard() {
    const token = useOwnToken();

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
