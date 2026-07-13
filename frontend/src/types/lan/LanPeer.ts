/**
 * Availability of a LAN peer. "busy" means the peer is currently in a peer
 * connection with someone else.
 */
export type LanPeerStatus = "online" | "busy";

/**
 * Represents another client discovered in the same local network.
 */
export interface LanPeer {
    /** Connection token of the remote peer, shown in the list and used to request a connection. */
    token: string;
    /** Operating system derived from the peer's user agent, e.g. "Windows". Undefined if not recognized. */
    os?: string;
    /** Browser derived from the peer's user agent, e.g. "Chrome". Undefined if not recognized. */
    browser?: string;
    /** Availability of the peer. */
    status: LanPeerStatus;
}
