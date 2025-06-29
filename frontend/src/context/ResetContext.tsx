import { createContext, useContext } from "react";

export type ConnectionsContextType = {
    resetWebsocketConnection: () => void;
};

export const ResetContext = createContext<ConnectionsContextType | null>(null);

export function useResetWebsocket() {
    const context = useContext(ResetContext);
    if (!context) throw new Error("ResetContext not available in context.");
    return context.resetWebsocketConnection;
}
