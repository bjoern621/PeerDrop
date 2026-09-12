import { useSyncExternalStore } from "react";
import { usePeerConnectionManager } from "../context/connection/PeerConnectionContext";
import { ConnectionRequestState } from "../services/PeerConnectionManager";

/**
 * Returns the latest server-pushed connection-request state snapshot and
 * re-renders whenever a new snapshot arrives.
 */
export function useConnectionRequestState(): ConnectionRequestState {
    const peerConnectionManager = usePeerConnectionManager();

    return useSyncExternalStore(
        onStoreChange => {
            peerConnectionManager.subscribeToConnectionRequestState(
                onStoreChange
            );
            return () => {
                peerConnectionManager.unsubscribeFromConnectionRequestState(
                    onStoreChange
                );
            };
        },
        () => peerConnectionManager.getConnectionRequestState()
    );
}
