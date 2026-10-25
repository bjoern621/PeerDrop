import { useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import css from "./SettingsMenu.module.scss";
import { IconSettings as SettingsIcon } from "@tabler/icons-react";
import Button from "../Button/Button";
import { useThemeContext } from "../../context/ThemeContext";
import useSettings from "../../hooks/useSettings";
import { updateSettings } from "../../services/SettingsStore";
import { useSettingsDialog } from "../../context/SettingsDialogContext";

const THEME_OPTIONS = ["light", "dark", "system"] as const;

/**
 * Gear button in the header that opens a settings dialog. The dialog is
 * anchored below the header like the auth dialog and closes on Escape and
 * on clicks outside of it. The open state comes from the settings dialog
 * context, so other components can open the dialog as well.
 */
export default function SettingsMenu() {
    const { t } = useTranslation(["settings", "common"]);
    const dialogRef = useRef<HTMLDialogElement>(null!);
    const { isOpen, openSettings, closeSettings } = useSettingsDialog();
    const { themePreference, setThemePreference } = useThemeContext();
    const { autoSaveDownloads, lanDiscovery } = useSettings();
    const autoSaveId = useId();
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
                aria-label={t("title")}
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
                aria-label={t("title")}
                onClose={() => closeSettings()}
                onClick={handleBackdropClick}
            >
                <div className={css.panelContent}>
                    <div className={css.panelTitle}>{t("title")}</div>

                    <div className={css.section}>
                        <div className={css.sectionTitle}>{t("theme")}</div>
                        <div
                            className={css.themeOptions}
                            role="radiogroup"
                            aria-label={t("theme")}
                        >
                            {THEME_OPTIONS.map(option => (
                                <button
                                    key={option}
                                    type="button"
                                    role="radio"
                                    aria-checked={themePreference === option}
                                    className={
                                        themePreference === option
                                            ? `${css.themeOption} ${css.active}`
                                            : css.themeOption
                                    }
                                    onClick={() => setThemePreference(option)}
                                >
                                    {t(`common:theme.${option}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={css.section}>
                        <div className={css.sectionTitle}>
                            {t("receivedFiles.title")}
                        </div>
                        <div className={css.toggleRow}>
                            <label htmlFor={autoSaveId}>
                                {t("receivedFiles.autoSave")}
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
                            {t("receivedFiles.autoSaveHint")}
                        </p>
                    </div>

                    <div className={css.section}>
                        <div className={css.sectionTitle}>
                            {t("network.title")}
                        </div>
                        <div className={css.toggleRow}>
                            <label htmlFor={lanDiscoveryId}>
                                {t("network.lanDiscovery")}
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
                            {t("network.lanDiscoveryHint")}
                        </p>
                    </div>
                </div>
            </dialog>
        </>
    );
}
