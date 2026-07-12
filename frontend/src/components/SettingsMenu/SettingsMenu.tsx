import { useId, useRef, useState } from "react";
import css from "./SettingsMenu.module.scss";
import SettingsIcon from "../../assets/actions/icons8-settings.svg?react";
import { useThemeContext } from "../../context/ThemeContext";
import useSettings from "../../hooks/useSettings";
import { updateSettings } from "../../services/SettingsStore";

const THEME_OPTIONS = [
    { value: "light", label: "Hell" },
    { value: "dark", label: "Dunkel" },
    { value: "system", label: "System" },
] as const;

/**
 * Gear button in the header that opens a settings dialog. The dialog is
 * anchored below the header like the auth dialog and closes on Escape and
 * on clicks outside of it.
 */
export default function SettingsMenu() {
    const dialogRef = useRef<HTMLDialogElement>(null!);
    const [isOpen, setIsOpen] = useState(false);
    const { themePreference, setThemePreference } = useThemeContext();
    const { autoSaveDownloads } = useSettings();
    const autoSaveId = useId();

    const openDialog = () => {
        setIsOpen(true);
        dialogRef.current.showModal();
    };

    const closeDialog = () => {
        dialogRef.current.close();
    };

    const handleBackdropClick = (event: React.MouseEvent) => {
        // Clicks on the backdrop target the dialog element itself.
        if (event.target === dialogRef.current) {
            closeDialog();
        }
    };

    return (
        <>
            <button
                type="button"
                className={css.gearButton}
                aria-label="Einstellungen"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                disabled={isOpen}
                onClick={() => openDialog()}
            >
                <SettingsIcon aria-hidden />
            </button>

            <dialog
                ref={dialogRef}
                className={css.dialog}
                aria-label="Einstellungen"
                onClose={() => setIsOpen(false)}
                onClick={handleBackdropClick}
            >
                <div className={css.panelContent}>
                    <div className={css.panelTitle}>Einstellungen</div>

                    <div className={css.section}>
                        <div className={css.sectionTitle}>Design</div>
                        <div
                            className={css.themeOptions}
                            role="radiogroup"
                            aria-label="Design"
                        >
                            {THEME_OPTIONS.map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={
                                        themePreference === option.value
                                    }
                                    className={
                                        themePreference === option.value
                                            ? `${css.themeOption} ${css.active}`
                                            : css.themeOption
                                    }
                                    onClick={() =>
                                        setThemePreference(option.value)
                                    }
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={css.section}>
                        <div className={css.sectionTitle}>
                            Empfangene Dateien
                        </div>
                        <div className={css.toggleRow}>
                            <label htmlFor={autoSaveId}>
                                Automatisch speichern
                            </label>
                            <input
                                id={autoSaveId}
                                type="checkbox"
                                className={css.switch}
                                checked={autoSaveDownloads}
                                onChange={event =>
                                    updateSettings({
                                        autoSaveDownloads: event.target.checked,
                                    })
                                }
                            />
                        </div>
                        <p className={css.hint}>
                            Wenn deaktiviert, wird eine empfangene Datei erst
                            nach einem Klick auf SPEICHERN gespeichert.
                        </p>
                    </div>
                </div>
            </dialog>
        </>
    );
}
