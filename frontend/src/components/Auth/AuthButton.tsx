import { useRef } from "react";
import Button from "../Button/Button";
import AuthDialog from "./AuthDialog";

export default function AuthButton() {
    const dialogRef = useRef<HTMLDialogElement>(null!);

    return (
        <>
            <Button
                onClick={() => dialogRef.current.showModal()}
                color_scheme={"neutral"}
                variant={"outline"}
            >
                Anmelden / Registrieren
            </Button>

            <AuthDialog ref={dialogRef} />
        </>
    );
}
