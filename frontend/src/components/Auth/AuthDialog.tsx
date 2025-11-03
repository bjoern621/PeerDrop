import { useEffect, useState, RefObject } from "react";
import { flushSync } from "react-dom";
import css from "./AuthDialog.module.scss";
import RegisterForm from "./RegisterForm";
import LoginForm from "./LoginForm";

type AuthForm = "login" | "register";

interface AuthDialogProps {
    ref: RefObject<HTMLDialogElement>;
}

export default function AuthDialog({ ref }: AuthDialogProps) {
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

    const handleLogin = (username: string, password: string) => {
        console.log("Login:", { username, password });
        // TODO: Implement default login logic

        ref.current.close();
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

        ref.current.close();
    };

    return (
        <dialog ref={ref} className={css.dialog}>
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
    );
}
