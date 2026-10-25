import { useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import css from "./SettingsMenu.module.scss";
import {
    IconSettings as SettingsIcon,
    IconX as CloseIcon,
} from "@tabler/icons-react";
import Button from "../Button/Button";
import IconButton from "../IconButton/IconButton";
import { useThemeContext } from "../../context/ThemeContext";
import useSettings from "../../hooks/useSettings";
import { updateSettings } from "../../services/SettingsStore";
import { useSettingsDialog } from "../../context/SettingsDialogContext";
import { useDialogOutsidePress } from "../../hooks/useDialogOutsidePress";

const THEME_OPTIONS = ["light", "dark", "system"] as const;

/**
 * Gear button in the header that opens a settings dialog. The dialog is
 * anchored below the header like the auth dialog and closes on Escape and
 * on clicks outside of it. The open state comes from the settings dialog
 * context, so other components can open the dialog as well.
 *
 * With `labelled`, the gear sits beside the title in a text button carrying
 * `labelClassName`.
 */
export default function SettingsMenu({
    labelled = false,
    labelClassName = "",
}: {
    labelled?: boolean;
    labelClassName?: string;
}) {
    const { t } = useTranslation(["settings", "common"]);
    const dialogRef = useRef<HTMLDialogElement>(null!);
    const { isOpen, openSettings, closeSettings } = useSettingsDialog();
    const { themePreference, setThemePreference } = useThemeContext();
    const { autoSaveDownloads, lanDiscovery, parallelTransfers } =
        useSettings();

    // showModal() throws on an already open dialog and close() on an already
    // closed one, so both calls go through the element's own open flag.
    useEffect(() => {
        if (isOpen && !dialogRef.current.open) {
            dialogRef.current.showModal();
        } else if (!isOpen && dialogRef.current.open) {
            dialogRef.current.close();
        }
    }, [isOpen]);

    useDialogOutsidePress(dialogRef, closeSettings);

    return (
        <>
            {labelled ? (
                <button
                    type="button"
                    className={labelClassName}
                    aria-haspopup="dialog"
                    aria-expanded={isOpen}
                    disabled={isOpen}
                    onClick={() => openSettings()}
                >
                    <SettingsIcon aria-hidden />
                    {t("title")}
                </button>
            ) : (
                <IconButton
                    className={css.gearButton}
                    size={"m"}
                    label={t("title")}
                    aria-haspopup="dialog"
                    aria-expanded={isOpen}
                    disabled={isOpen}
                    onClick={() => openSettings()}
                >
                    <SettingsIcon aria-hidden />
                </IconButton>
            )}

            <dialog
                ref={dialogRef}
                className={css.dialog}
                aria-label={t("title")}
                onClose={() => closeSettings()}
            >
                <div className={css.panelContent}>
                    <div className={css.panelHeader}>
                        <div className={css.panelTitle}>{t("title")}</div>
                        <Button
                            className={css.closeButton}
                            color_scheme={"error"}
                            aria-label={t("close")}
                            onClick={() => closeSettings()}
                        >
                            <CloseIcon aria-hidden />
                        </Button>
                    </div>

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
                        <SettingToggle
                            label={t("receivedFiles.autoSave")}
                            hint={t("receivedFiles.autoSaveHint")}
                            checked={autoSaveDownloads}
                            onChange={checked =>
                                updateSettings({ autoSaveDownloads: checked })
                            }
                        />
                    </div>

                    <div className={css.section}>
                        <div className={css.sectionTitle}>
                            {t("network.title")}
                        </div>
                        <SettingToggle
                            label={t("network.lanDiscovery")}
                            hint={t("network.lanDiscoveryHint")}
                            checked={lanDiscovery}
                            onChange={checked =>
                                updateSettings({ lanDiscovery: checked })
                            }
                        />
                        <SettingToggle
                            label={t("network.parallelTransfers")}
                            hint={t("network.parallelTransfersHint")}
                            checked={parallelTransfers}
                            onChange={checked =>
                                updateSettings({ parallelTransfers: checked })
                            }
                        />
                    </div>
                </div>
            </dialog>
        </>
    );
}

/** One on/off setting: label and switch in a row, the hint below. */
function SettingToggle({
    label,
    hint,
    checked,
    onChange,
}: {
    label: string;
    hint: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    const id = useId();
    return (
        <>
            <div className={css.toggleRow}>
                <label htmlFor={id}>{label}</label>
                <input
                    id={id}
                    type="checkbox"
                    className={css.switch}
                    checked={checked}
                    onChange={event => onChange(event.target.checked)}
                />
            </div>
            <p className={css.hint}>{hint}</p>
        </>
    );
}
