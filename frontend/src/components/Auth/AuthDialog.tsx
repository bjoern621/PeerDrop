import { useEffect, useState, RefObject } from "react";
import { flushSync } from "react-dom";
import css from "./AuthDialog.module.scss";
import RegisterForm from "./RegisterForm";
import LoginForm from "./LoginForm";
import errorAsValue from "../../util/ErrorAsValue";
import { UserLoginDto } from "../../util/dtos/UserLoginDto";
import { toast } from "react-toastify/unstyled";
import { useResetWebsocket } from "../../context/connection/ResetContext";

type AuthForm = "login" | "register";

interface AuthDialogProps {
    ref: RefObject<HTMLDialogElement>;
}

export default function AuthDialog({ ref }: AuthDialogProps) {
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

    useEffect(() => {
        const dialog = ref.current;

        const handleBackdropClick = (e: MouseEvent) => {
            const rect = dialog.getBoundingClientRect();
            if (
                e.clientX < rect.left ||
                e.clientX > rect.right ||
                e.clientY < rect.top ||
                e.clientY > rect.bottom
            ) {
                dialog.close();
            }
        };

        dialog.addEventListener("click", handleBackdropClick);

        return () => {
            dialog.removeEventListener("click", handleBackdropClick);
        };
    }, [ref]);

    const handleLogin = async (username: string, password: string) => {
        const userData: UserLoginDto = {
            username: username,
            password: password,
        };

        const [response, err] = await errorAsValue(
            fetch(`${import.meta.env.VITE_BACKEND_URL}/login`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(userData),
            })
        );

        if (err) {
            toast.error(
                "Fehler beim Einloggen. Bitte versuche es später erneut."
            );
            console.error("Fehler beim Einloggen:", err);
            return;
        }

        if (!response.ok) {
            toast.error("Ungültiger Benutzername oder Passwort.");
            return;
        }

        resetWebsocketConnection();
        ref.current?.close();
        toast.success("Erfolgreich eingeloggt!");
    };

    const handleRegister = async (
        username: string,
        password: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _confirmPassword: string
    ) => {
        const userData: UserLoginDto = {
            username: username,
            password: password,
        };

        const [response, err] = await errorAsValue(
            fetch(`${import.meta.env.VITE_BACKEND_URL}/accounts`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(userData),
            })
        );

        if (err) {
            toast.error(
                "Fehler beim Registrieren. Bitte versuche es später erneut."
            );
            console.error("Fehler beim Registrieren:", err);
            return;
        }

        if (response.status === 409) {
            toast.error("Benutzername bereits vergeben.");
            return;
        }

        if (!response.ok) {
            toast.error("Ungültiger Benutzername oder Passwort.");
            return;
        }

        resetWebsocketConnection();
        ref.current?.close();
        toast.success("Erfolgreich registriert!");
    };

    return (
        <dialog ref={ref} className={css.dialog}>
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
