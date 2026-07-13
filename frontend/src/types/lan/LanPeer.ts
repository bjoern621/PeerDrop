/**
 * Represents another client discovered in the same local network.
 */
export interface LanPeer {
    /** Connection token of the remote peer, used to request a connection. */
    token: string;
    /** Human-readable name shown in the LAN peer list, e.g. "Flinker Fuchs". */
    displayName: string;
    /** Short device description derived from the peer's user agent, e.g. "Chrome · Windows". */
    deviceInfo: string;
}
