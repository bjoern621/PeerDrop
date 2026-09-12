import { toast } from "react-toastify/unstyled";
import css from "./OwnToken.module.scss";
import errorAsValue from "../../../util/ErrorAsValue";
import ProfileIcon from "../../../assets/icons8-name-tag.svg?react";
import GroupIcon from "../../../assets/icons8-group.svg?react";
import CopyIcon from "../../../assets/actions/icons8-copy.svg?react";
import CopyLinkIcon from "../../../assets/actions/icons8-copy-link.svg?react";
import { useEffect, useState } from "react";
import { assert } from "../../../util/Assert";
import { useWebSocketService } from "../../../context/connection/WebSocketContext";
import Button from "../../Button/Button";
import { getRuntimeEnvVars } from "../../../util/RuntimeEnvVars";

export default function OwnToken() {
    const websocket = useWebSocketService();

    const [clientToken, setClientToken] = useState<string | undefined>(
        undefined
    );

    useEffect(() => {
        assert(websocket, "WebSocketService is not initialized.");

        const token = websocket.getLocalClientToken();
        let checkToken: number | undefined = undefined;
        if (token) {
            setClientToken(token);
        } else {
            // If not available immediately, set up polling
            checkToken = setInterval(() => {
                const token = websocket.getLocalClientToken();
                if (token) {
                    setClientToken(token);
                    clearInterval(checkToken);
                }
            }, 500);
        }
    }, [websocket]);

    const copyToken = async () => {
        if (!clientToken) {
            return;
        }

        const [, err] = await errorAsValue(
            navigator.clipboard.writeText(clientToken)
        );

        if (err) {
            console.error("Failed to copy token:", err);
            return;
        }

        toast.success("Token in die Zwischenablage kopiert!", {
            toastId: "token-copied-toast",
            updateId: "token-copied-toast",
        });
    };

    const copyTokenLink = async () => {
        if (!clientToken) {
            return;
        }

        const [, err] = await errorAsValue(
            navigator.clipboard.writeText(
                `${getRuntimeEnvVars().frontendDomain}/connect?token=${clientToken}`
            )
        );

        if (err) {
            console.error("Failed to copy token as link:", err);
            return;
        }

        toast.success("Token-Link in die Zwischenablage kopiert!", {
            toastId: "token-link-copied-toast",
            updateId: "token-link-copied-toast",
        });
    };

    const openGroupRoom = () => {};
    return (
        <div className={css.ownTokenContainer}>
            <h2 className={css.heading}>
                <ProfileIcon />
                Dein Token
            </h2>

            <div className={css.tokenBox}>
                <div className={css.token}>
                    {clientToken?.toUpperCase() ?? "_____"}
                </div>
                <p className={css.mutedText}>Teile diesen Token mit anderen</p>
            </div>

            <div>
                <Button
                    variant={"outline"}
                    color_scheme={"neutral"}
                    disabled={!clientToken}
                    className={css.openGroupRoomButton}
                    onClick={() => openGroupRoom()}
                >
                    <GroupIcon />
                    Gruppenraum öffnen
                </Button>
                <div className={css.copyButtons}>
                    <Button
                        variant={"outline"}
                        color_scheme={"neutral"}
                        disabled={!clientToken}
                        onClick={() => void copyToken()}
                    >
                        <CopyIcon />
                        Token kopieren
                    </Button>
                    <Button
                        variant={"outline"}
                        color_scheme={"neutral"}
                        disabled={!clientToken}
                        onClick={() => void copyTokenLink()}
                    >
                        <CopyLinkIcon />
                        Token als Link kopieren
                    </Button>
                </div>
            </div>
        </div>
    );
}
