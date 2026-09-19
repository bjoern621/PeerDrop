/* eslint-disable react-refresh/only-export-components */
import { createContext, ReactNode, useContext, useMemo, useState } from "react";

interface SettingsDialogContextType {
    isOpen: boolean;
    openSettings: () => void;
    closeSettings: () => void;
}

const SettingsDialogContext = createContext<
    SettingsDialogContextType | undefined
>(undefined);

/**
 * Opens and closes the settings dialog from anywhere in the app. The dialog
 * itself is rendered by the settings menu in the header.
 */
export function useSettingsDialog() {
    const context = useContext(SettingsDialogContext);
    if (context === undefined) {
        throw new Error(
            "useSettingsDialog must be used within a SettingsDialogProvider"
        );
    }
    return context;
}

export function SettingsDialogProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    const value = useMemo(
        () => ({
            isOpen,
            openSettings: () => setIsOpen(true),
            closeSettings: () => setIsOpen(false),
        }),
        [isOpen]
    );

    return (
        <SettingsDialogContext.Provider value={value}>
            {children}
        </SettingsDialogContext.Provider>
    );
}
