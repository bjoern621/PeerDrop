import { useSyncExternalStore } from "react";
import { usePeerConnectionManager } from "../context/connection/PeerConnectionContext";
import { TransferSnapshot } from "../services/TransferTracker";

/** File transfers in both directions, kept current. */
export function useTransfers(): TransferSnapshot[] {
    const transferTracker = usePeerConnectionManager().getTransferTracker();
    return useSyncExternalStore(
        listener => transferTracker.subscribe(listener),
        () => transferTracker.getSnapshot()
    );
}
