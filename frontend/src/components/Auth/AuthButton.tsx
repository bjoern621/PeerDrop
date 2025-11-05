import { useRef } from "react";
import Button from "../Button/Button";
import AuthDialog from "./AuthDialog";
import { useAuth } from "../../context/AuthContext";

export default function AuthButton() {
    const dialogRef = useRef<HTMLDialogElement>(null!);
    const { isLoggedIn, isLoading, logout } = useAuth();

    if (isLoading) {
        return null;
    }

    return (
        <>
            {isLoggedIn ? (
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

            <AuthDialog ref={dialogRef} />
        </>
    );
}
