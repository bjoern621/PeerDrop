/**
 * Path class of the selected ICE candidate pair. relay: either side sends
 * through a TURN server. reflexive: either side crossed a NAT. host: both
 * candidates are local addresses.
 */
export type Route = "host" | "reflexive" | "relay";
