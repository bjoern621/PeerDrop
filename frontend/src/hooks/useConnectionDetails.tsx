import { useEffect, useState } from "react";
import { usePeerConnectionManager } from "../context/connection/PeerConnectionContext";
import { PeerConnectionDetails } from "../services/PeerConnectionManager";
import { ClientToken } from "../services/WebSocketService";
import { CONNECTION_DETAILS_INTERVAL_MS } from "../util/Constants";

const BITS_PER_MBIT = 1_000_000;

export interface ConnectionDetailsEntry extends PeerConnectionDetails {
    /** Mbit/s since the previous reading. Null on the first reading of a connection. */
    sendMbps: number | null;
    receiveMbps: number | null;
}

/**
 * State and statistics of the connection to every peer, read every
 * CONNECTION_DETAILS_INTERVAL_MS while the component is mounted.
 */
export function useConnectionDetails(): ConnectionDetailsEntry[] {
    const peerConnectionManager = usePeerConnectionManager();
    const [entries, setEntries] = useState<ConnectionDetailsEntry[]>([]);

    useEffect(() => {
        let previous = new Map<ClientToken, PeerConnectionDetails>();
        let stopped = false;

        const read = async () => {
            const details = await peerConnectionManager.readConnectionDetails();
            if (stopped) {
                return;
            }
            setEntries(
                details.map(current =>
                    withRates(current, previous.get(current.remoteToken))
                )
            );
            previous = new Map(
                details.map(current => [current.remoteToken, current])
            );
        };

        void read();
        const timer = window.setInterval(
            () => void read(),
            CONNECTION_DETAILS_INTERVAL_MS
        );
        return () => {
            stopped = true;
            window.clearInterval(timer);
        };
        // exhaustive-deps-exclude [peerConnectionManager]
    }, []);

    return entries;
}

/** Adds the rates since `previous`. A replaced connection restarts its byte counts and gets no rates. */
function withRates(
    current: PeerConnectionDetails,
    previous: PeerConnectionDetails | undefined
): ConnectionDetailsEntry {
    const seconds = previous ? (current.readAt - previous.readAt) / 1000 : 0;
    if (
        !previous ||
        seconds <= 0 ||
        current.bytesSent < previous.bytesSent ||
        current.bytesReceived < previous.bytesReceived
    ) {
        return { ...current, sendMbps: null, receiveMbps: null };
    }
    return {
        ...current,
        sendMbps:
            ((current.bytesSent - previous.bytesSent) * 8) /
            BITS_PER_MBIT /
            seconds,
        receiveMbps:
            ((current.bytesReceived - previous.bytesReceived) * 8) /
            BITS_PER_MBIT /
            seconds,
    };
}
