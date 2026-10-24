/**
 * Represents another client discovered in the same local network.
 */
export interface LanPeer {
    /** Token of the remote peer, shown in the list and used as recipient. */
    token: string;
    /** Operating system derived from the peer's user agent, e.g. "Windows". Undefined if not recognized. */
    os?: string;
    /** Browser derived from the peer's user agent, e.g. "Chrome". Undefined if not recognized. */
    browser?: string;
}
