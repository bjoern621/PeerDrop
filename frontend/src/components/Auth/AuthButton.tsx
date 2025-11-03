import { useEffect, useRef, useState } from "react";
import Button from "../Button/Button";
import AuthDialog from "./AuthDialog";
import { assert } from "../../util/Assert";
import errorAsValue from "../../util/ErrorAsValue";
import { toast } from "react-toastify/unstyled";
import { StatusResponse } from "../../util/dtos/StatusResponse";

export default function AuthButton() {
    const dialogRef = useRef<HTMLDialogElement>(null!);
    const [loggedIn, setLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const getLoggedInStatus = async () => {
        const [response, err] = await errorAsValue(
            fetch(`${import.meta.env.VITE_BACKEND_URL}/me/status`, {
                method: "GET",
                credentials: "include",
            })
        );

        if (err) {
            toast.error(
                "Fehler beim Abrufen des Login-Status. Bitte versuche es später erneut."
            );
            return false;
        }

        if (!response.ok) {
            toast.error(
                "Fehler beim Abrufen des Login-Status. Bitte versuche es später erneut."
            );
            return false;
        }

        const [responseBody, parseError] = await errorAsValue(response.json());

        if (parseError) {
            toast.error(
                "Fehler beim Abrufen des Login-Status. Bitte versuche es später erneut."
            );
            console.error("Fehler beim Parsen der Antwort:", parseError);
            return false;
        }

        const statusData = responseBody as StatusResponse;
        assert(
            statusData && typeof statusData.status === "boolean",
            "Invalid user status response"
        );

        return statusData.status;
    };

    useEffect(() => {
        void getLoggedInStatus().then(status => {
            setLoggedIn(status);
            setIsLoading(false);
        });
    }, []);

    const logout = async () => {
        const [response, err] = await errorAsValue(
            fetch(`${import.meta.env.VITE_BACKEND_URL}/logout`, {
                method: "POST",
                credentials: "include",
            })
        );

        if (err) {
            toast.error(
                "Fehler beim Ausloggen. Bitte versuche es später erneut."
            );
            console.error("Error logging out:", err);
            return;
        } else if (!response.ok) {
            toast.error(
                "Fehler beim Ausloggen. Bitte versuche es später erneut."
            );
            console.error("Error logging out:", response.statusText);
            return;
        }

        setLoggedIn(false);
        toast.success("Erfolgreich ausgeloggt");
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

            <AuthDialog ref={dialogRef} />
        </>
    );
}
