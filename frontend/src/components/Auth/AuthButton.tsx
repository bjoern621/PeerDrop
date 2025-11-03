import { useRef, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import Button from "../Button/Button";
import css from "./AuthButton.module.scss";
import RegisterForm from "./RegisterForm";
import LoginForm from "./LoginForm";

type AuthForm = "login" | "register";

export default function AuthButton() {
    const dialogRef = useRef<HTMLDialogElement>(null);

    const [mode, setMode] = useState<AuthForm>("login");

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
        const dialog = dialogRef.current;
        if (!dialog) return;

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
    }, []);

    const handleLogin = (username: string, password: string) => {
        console.log("Login:", { username, password });
        // TODO: Implement default login logic
        dialogRef.current?.close();
    };

    const handleRegister = (
        username: string,
        password: string,
        confirmPassword: string
    ) => {
        console.log("Register:", {
            username,
            password,
            confirmPassword,
        });
        // TODO: Implement default registration logic
        dialogRef.current?.close();
    };

    return (
        <>
            <Button
                onClick={() => dialogRef.current?.showModal()}
                color_scheme={"neutral"}
                variant={"outline"}
            >
                Anmelden / Registrieren
            </Button>

            <dialog ref={dialogRef} className={css.dialog}>
                {mode === "login" ? (
                    <LoginForm
                        onSubmit={handleLogin}
                        onSwitchToRegister={() => switchMode("register")}
                    />
                ) : (
                    <RegisterForm
                        onSubmit={handleRegister}
                        onSwitchToLogin={() => switchMode("login")}
                    />
                )}
            </dialog>
        </>
    );
}
