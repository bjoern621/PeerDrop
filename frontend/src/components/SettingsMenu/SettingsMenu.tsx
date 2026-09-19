import { useEffect, useId, useRef } from "react";
import css from "./SettingsMenu.module.scss";
import SettingsIcon from "../../assets/icons8-settings.svg?react";
import Button from "../Button/Button";
import { useThemeContext } from "../../context/ThemeContext";
import useSettings from "../../hooks/useSettings";
import { updateSettings } from "../../services/SettingsStore";
import { useSettingsDialog } from "../../context/SettingsDialogContext";

const THEME_OPTIONS = [
    { value: "light", label: "Hell" },
    { value: "dark", label: "Dunkel" },
    { value: "system", label: "System" },
] as const;

/**
 * Gear button in the header that opens a settings dialog. The dialog is
 * anchored below the header like the auth dialog and closes on Escape and
 * on clicks outside of it. The open state comes from the settings dialog
 * context, so other components can open the dialog as well.
 */
export default function SettingsMenu() {
    const dialogRef = useRef<HTMLDialogElement>(null!);
    const { isOpen, openSettings, closeSettings } = useSettingsDialog();
    const { themePreference, setThemePreference } = useThemeContext();
    const { autoSaveDownloads, showConnectWarning, lanDiscovery } =
        useSettings();
    const autoSaveId = useId();
    const connectWarningId = useId();
    const lanDiscoveryId = useId();

    // showModal() throws on an already open dialog and close() on an already
    // closed one, so both calls go through the element's own open flag.
    useEffect(() => {
        if (isOpen && !dialogRef.current.open) {
            dialogRef.current.showModal();
        } else if (!isOpen && dialogRef.current.open) {
            dialogRef.current.close();
        }
    }, [isOpen]);

    const handleBackdropClick = (event: React.MouseEvent) => {
        // Clicks on the backdrop target the dialog element itself.
        if (event.target === dialogRef.current) {
            closeSettings();
        }
    };

    return (
        <>
            <Button
                className={css.gearButton}
                color_scheme={"neutral"}
                variant={"outline"}
                aria-label="Einstellungen"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                disabled={isOpen}
                onClick={() => openSettings()}
            >
                <SettingsIcon aria-hidden />
            </Button>

            <dialog
                ref={dialogRef}
                className={css.dialog}
                aria-label="Einstellungen"
                onClose={() => closeSettings()}
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

                    <div className={css.section}>
                        <div className={css.sectionTitle}>Verbindung</div>
                        <div className={css.toggleRow}>
                            <label htmlFor={connectWarningId}>
                                Sicherheitshinweis anzeigen
                            </label>
                            <input
                                id={connectWarningId}
                                type="checkbox"
                                className={css.switch}
                                checked={showConnectWarning}
                                onChange={event =>
                                    updateSettings({
                                        showConnectWarning:
                                            event.target.checked,
                                    })
                                }
                            />
                        </div>
                        <p className={css.hint}>
                            Der Hinweis erscheint vor jedem Verbindungsaufbau zu
                            einem anderen Gerät.
                        </p>

                        <div className={css.toggleRow}>
                            <label htmlFor={lanDiscoveryId}>
                                Geräte im Netzwerk finden
                            </label>
                            <input
                                id={lanDiscoveryId}
                                type="checkbox"
                                className={css.switch}
                                checked={lanDiscovery}
                                onChange={event =>
                                    updateSettings({
                                        lanDiscovery: event.target.checked,
                                    })
                                }
                            />
                        </div>
                        <p className={css.hint}>
                            Dein Gerät erscheint dann bei anderen Geräten im
                            selben Netzwerk und zeigt sie dir an.
                        </p>
                    </div>
                </div>
            </dialog>
        </>
    );
}
