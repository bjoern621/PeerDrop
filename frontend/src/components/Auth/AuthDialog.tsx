import { useState, useEffect, RefObject } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import css from "./AuthDialog.module.scss";
import RegisterForm from "./RegisterForm";
import LoginForm from "./LoginForm";
import { useResetWebsocket } from "../../context/connection/ResetContext";
import { useAuth } from "../../context/AuthContext";
import { IconX as ExitIcon } from "@tabler/icons-react";
import { useDialogOutsidePress } from "../../hooks/useDialogOutsidePress";
import Button from "../Button/Button";
import { useResizeObserver } from "../../hooks/useResizeObserver";
import { useWindowEvent } from "../../hooks/useWindowEvent";

type AuthForm = "login" | "register";

interface AuthDialogProps {
    ref: RefObject<HTMLDialogElement>;
    onClose?: () => void;
}

const initialFormMode: AuthForm = "login";
const initialSharedUsername = "";
const initialSharedPassword = "";

export default function AuthDialog({ ref, onClose }: AuthDialogProps) {
    const { t } = useTranslation("auth");
    const [mode, setMode] = useState<AuthForm>(initialFormMode);
    const [sharedUsername, setSharedUsername] = useState<string>(
        initialSharedUsername
    );
    const [sharedPassword, setSharedPassword] = useState<string>(
        initialSharedPassword
    );
    const [formKey, setFormKey] = useState(0);

    const { login, register } = useAuth();
    const resetWebsocketConnection = useResetWebsocket();

    useToastOffset(ref);

    const switchMode = (newMode: AuthForm) => {
        if (document.startViewTransition) {
            document.startViewTransition(() => {
                // Ensure React updates synchronously during the transition callback
                flushSync(() => {
                    setMode(newMode);
                });
            });
        } else {
            // Fallback for browsers without View Transitions
            setMode(newMode);
        }
    };

    const signInWith =
        (action: typeof login) =>
        async (username: string, password: string) => {
            if (await action(username, password)) {
                resetWebsocketConnection();
                resetForm();
                closeDialog();
            }
        };
    const handleLogin = signInWith(login);
    const handleRegister = signInWith(register);

    // close() fires the dialog's close event, which reports every way of
    // closing (button, backdrop click, Escape) through onClose.
    const closeDialog = () => {
        ref.current.close();
    };

    useDialogOutsidePress(ref, closeDialog);

    const resetForm = () => {
        setMode(initialFormMode);
        setSharedUsername(initialSharedUsername);
        setSharedPassword(initialSharedPassword);
        setFormKey(prev => prev + 1); // Force remount of form components to clear internal state
    };

    return (
        <dialog ref={ref} className={css.dialog} onClose={() => onClose?.()}>
            <div className={css.content}>
                <Button
                    className={css.closeButton}
                    onClick={() => closeDialog()}
                    color_scheme={"error"}
                    aria-label={t("closeDialog")}
                >
                    <ExitIcon />
                </Button>

                {mode === "login" ? (
                    <LoginForm
                        key={formKey}
                        onSubmit={(username, password) => {
                            void handleLogin(username, password);
                        }}
                        onSwitchToRegister={() => switchMode("register")}
                        initialUsername={sharedUsername}
                        onUsernameChange={setSharedUsername}
                        initialPassword={sharedPassword}
                        onPasswordChange={setSharedPassword}
                    />
                ) : (
                    <RegisterForm
                        key={formKey}
                        onSubmit={(username, password) => {
                            void handleRegister(username, password);
                        }}
                        onSwitchToLogin={() => switchMode("login")}
                        initialUsername={sharedUsername}
                        onUsernameChange={setSharedUsername}
                        initialPassword={sharedPassword}
                        onPasswordChange={setSharedPassword}
                    />
                )}
            </div>
        </dialog>
    );
}

const TOAST_OFFSET = "--auth-dialog-bottom";

/**
 * Mirrors the bottom edge of the open dialog into TOAST_OFFSET on the root element,
 * so the toast container sits below it (see toastify-styles.scss).
 */
function useToastOffset(ref: RefObject<HTMLDialogElement>) {
    // Open and close change the rendered size from and to zero; a form switch changes the height.
    useResizeObserver(ref, publishToastOffset);
    // A change of the header height moves the anchored dialog.
    useWindowEvent("resize", () => publishToastOffset(ref.current));
    useEffect(
        () => () => {
            document.documentElement.style.removeProperty(TOAST_OFFSET);
        },
        []
    );
}

/** offsetTop and offsetHeight are layout values and ignore the scale transform of the open animation. */
function publishToastOffset(dialog: HTMLDialogElement) {
    const style = document.documentElement.style;
    if (dialog.open) {
        style.setProperty(
            TOAST_OFFSET,
            `${dialog.offsetTop + dialog.offsetHeight}px`
        );
    } else {
        style.removeProperty(TOAST_OFFSET);
    }
}
