import { useState, RefObject } from "react";
import { flushSync } from "react-dom";
import css from "./AuthDialog.module.scss";
import RegisterForm from "./RegisterForm";
import LoginForm from "./LoginForm";
import { useResetWebsocket } from "../../context/connection/ResetContext";
import { AuthService } from "../../services/AuthService";
import ExitIcon from "../../assets/icons8-close-2.svg?react";
import Button from "../Button/Button";

type AuthForm = "login" | "register";

interface AuthDialogProps {
    ref: RefObject<HTMLDialogElement>;
    onLoginSuccess: () => void;
}

export default function AuthDialog({ ref, onLoginSuccess }: AuthDialogProps) {
    const [mode, setMode] = useState<AuthForm>("login");
    const [sharedUsername, setSharedUsername] = useState<string>("");
    const [sharedPassword, setSharedPassword] = useState<string>("");

    const resetWebsocketConnection = useResetWebsocket();

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

    const handleLogin = async (username: string, password: string) => {
        const success = await AuthService.login(username, password);

        if (success) {
            resetWebsocketConnection();
            ref.current.close();
            onLoginSuccess();
        }
    };

    const handleRegister = async (
        username: string,
        password: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _confirmPassword: string
    ) => {
        const success = await AuthService.register(username, password);

        if (success) {
            resetWebsocketConnection();
            ref.current.close();
            onLoginSuccess();
        }
    };

    return (
        <dialog ref={ref} className={css.dialog}>
            <Button
                className={css.closeButton}
                onClick={() => ref.current.close()}
                color_scheme={"neutral"}
            >
                <ExitIcon />
            </Button>

            {mode === "login" ? (
                <LoginForm
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
                    onSubmit={(username, password, confirmPassword) => {
                        void handleRegister(
                            username,
                            password,
                            confirmPassword
                        );
                    }}
                    onSwitchToLogin={() => switchMode("login")}
                    initialUsername={sharedUsername}
                    onUsernameChange={setSharedUsername}
                    initialPassword={sharedPassword}
                    onPasswordChange={setSharedPassword}
                />
            )}
        </dialog>
    );
}
