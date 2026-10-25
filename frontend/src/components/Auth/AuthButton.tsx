import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../Button/Button";
import AuthDialog from "./AuthDialog";
import { useAuth } from "../../context/AuthContext";
import css from "./AuthButton.module.scss";

export default function AuthButton() {
    const { t } = useTranslation("auth");
    const dialogRef = useRef<HTMLDialogElement>(null!);
    const { isLoggedIn, isStatusKnown, logout } = useAuth();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleDialogClose = () => {
        setIsDialogOpen(false);
    };

    const openDialog = () => {
        setIsDialogOpen(true);
        dialogRef.current.showModal();
    };

    return (
        <>
            {isLoggedIn ? (
                <Button
                    variant={"outline"}
                    color_scheme={"neutral"}
                    onClick={() => void logout()}
                    disabled={isDialogOpen}
                >
                    {t("logout")}
                </Button>
            ) : (
                <Button
                    className={isStatusKnown ? undefined : css.pending}
                    onClick={() => openDialog()}
                    color_scheme={"neutral"}
                    variant={"outline"}
                    disabled={isDialogOpen}
                >
                    {t("openDialog")}
                </Button>
            )}

            <AuthDialog ref={dialogRef} onClose={handleDialogClose} />
        </>
    );
}
