import { useRef, useState } from "react";
import Button from "../Button/Button";
import AuthDialog from "./AuthDialog";
import { useAuth } from "../../context/AuthContext";

export default function AuthButton() {
    const dialogRef = useRef<HTMLDialogElement>(null!);
    const { isLoggedIn, isLoading, logout } = useAuth();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleDialogClose = () => {
        setIsDialogOpen(false);
    };

    const openDialog = () => {
        setIsDialogOpen(true);
        dialogRef.current.showModal();
    };

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
                    disabled={isDialogOpen}
                >
                    Ausloggen
                </Button>
            ) : (
                <Button
                    onClick={() => openDialog()}
                    color_scheme={"neutral"}
                    variant={"outline"}
                    disabled={isDialogOpen}
                >
                    Anmelden / Registrieren
                </Button>
            )}

            <AuthDialog ref={dialogRef} onClose={handleDialogClose} />
        </>
    );
}
