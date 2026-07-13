import { useEffect, useState } from "react";
import { LanPeer } from "../types/lan/LanPeer";

// TODO: Replace with real LAN discovery.
// The backend groups clients by public IP (same IP = same network) and
// pushes the peer list over the existing WebSocket connection.
const STUB_LAN_PEERS: LanPeer[] = [
    {
        token: "K7Q2M",
        displayName: "Flinker Fuchs",
        deviceInfo: "Chrome · Windows",
    },
    {
        token: "X4B9T",
        displayName: "Mutiger Adler",
        deviceInfo: "Safari · iPhone",
    },
    {
        token: "P3W6R",
        displayName: "Stiller Panda",
        deviceInfo: "Firefox · Linux",
    },
];

/**
 * Provides the list of peers discovered in the local network.
 *
 * Currently returns stub data after a short artificial delay so the UI
 * (including the searching state) can be developed against realistic behavior.
 */
export const useLanPeers = () => {
    const [peers, setPeers] = useState<LanPeer[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>(true);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setPeers(STUB_LAN_PEERS);
            setIsSearching(false);
        }, 1500);

        return () => clearTimeout(timeoutId);
    }, []);

    return { peers, isSearching };
};
