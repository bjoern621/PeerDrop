/** Number of token colors defined as --peer-0 to --peer-7 in the theme. */
const PEER_COLORS = 8;

/**
 * Color of a token in the transfer list. The same token keeps its color in
 * every row and session.
 */
export function peerColor(token: string): string {
    // FNV-1a, folded so neighbouring tokens land on different slots.
    let hash = 2166136261;
    for (let i = 0; i < token.length; i++) {
        hash = Math.imul(hash ^ token.charCodeAt(i), 16777619) >>> 0;
    }
    return `var(--peer-${((hash ^ (hash >>> 16)) >>> 0) % PEER_COLORS})`;
}
