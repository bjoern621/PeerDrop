import { useEffect, useId, useRef, useState } from "react";
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
 * Gear button in the header that opens a settings panel. The panel closes on
 * Escape and on clicks outside of the menu.
 */
export default function SettingsMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { themePreference, setThemePreference } = useThemeContext();
    const { autoSaveDownloads } = useSettings();
    const autoSaveId = useId();

    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    return (
        <div className={css.settingsMenu} ref={containerRef}>
            <button
                type="button"
                className={css.gearButton}
                aria-label="Einstellungen"
                aria-haspopup="true"
                aria-expanded={isOpen}
                onClick={() => setIsOpen(open => !open)}
            >
                <SettingsIcon aria-hidden />
            </button>

            {isOpen && (
                <div className={css.panel} aria-label="Einstellungen">
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
            )}
        </div>
    );
}
