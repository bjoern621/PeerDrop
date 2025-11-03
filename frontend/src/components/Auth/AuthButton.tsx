import { useEffect, useRef, useState } from "react";
import Button from "../Button/Button";
import AuthDialog from "./AuthDialog";
import { AuthService } from "../../services/AuthService";

export default function AuthButton() {
    const dialogRef = useRef<HTMLDialogElement>(null!);
    const [loggedIn, setLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        void AuthService.getLoggedInStatus().then(status => {
            setLoggedIn(status);
            setIsLoading(false);
        });
    }, []);

    const logout = async () => {
        const success = await AuthService.logout();
        if (success) {
            setLoggedIn(false);
        }
    };

    if (isLoading) {
        return null;
    }

    return (
        <>
            {loggedIn ? (
                <Button
                    variant={"outline"}
                    color_scheme={"neutral"}
                    onClick={() => void logout()}
                >
                    Ausloggen
                </Button>
            ) : (
                <Button
                    onClick={() => dialogRef.current.showModal()}
                    color_scheme={"neutral"}
                    variant={"outline"}
                >
                    Anmelden / Registrieren
                </Button>
            )}

            <AuthDialog
                ref={dialogRef}
                onLoginSuccess={() => setLoggedIn(true)}
            />
        </>
    );
}
