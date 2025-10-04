import { createContext, useContext } from "react";
import { PeerConnectionManager } from "../../services/PeerConnectionManager";
import { assert } from "../../util/Assert";

export const PeerConnectionContext =
    createContext<PeerConnectionManager | null>(null);

export function usePeerConnectionManager() {
    const context = useContext(PeerConnectionContext);
    assert(context, "PeerConnectionManager not available in context.");
    return context;
}
