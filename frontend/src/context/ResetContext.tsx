import { createContext, useContext } from "react";

export type ConnectionsContextType = {
    resetConnections: () => void;
};

export const ResetContext = createContext<ConnectionsContextType | null>(null);

export function useResetConnections() {
    const context = useContext(ResetContext);
    if (!context) throw new Error("ResetContext not available in context.");
    return context.resetConnections;
}
