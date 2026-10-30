export const HEARTBEAT_INTERVAL_MS = 1000 * 60; // 1 minute; THIS IS LINKED TO THE BACKEND VARIABLE: INACTIVE_HEARTBEAT_CHECK_INTERVAL_MS

/** Time between two checks that the server still answers, besides the checks on waking up and going online. */
export const SERVER_CHECK_INTERVAL_MS = 30_000;

/** Time that the server gets to answer a check before the connection counts as broken. */
export const SERVER_PONG_TIMEOUT_MS = 5_000;

/** Waits before the attempts to reconnect to the server, in order. The last one repeats. */
export const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

/** Number of characters in a client token. */
export const CLIENT_TOKEN_LENGTH = 5;

/** Characters of a chosen token, in any order. */
export const CLIENT_TOKEN_CHARACTERS = "abcdefghijklmnopqrstuvwxyz0123456789"; // Linked to the backend ClientTokenFormat

/** Peer connections that one outgoing file spreads over while the parallelTransfers setting is on. */
export const PARALLEL_TRANSFER_LANES = 4;

/** Peer connections accepted from one peer; lane indexes from 0 up to this bound (exclusive). */
export const MAX_TRANSFER_LANES = 8;

/** Time between two reports of the CPU load. */
export const CPU_PRESSURE_SAMPLE_INTERVAL_MS = 1_000;

/** Time between two readings of the connection details on screen. */
export const CONNECTION_DETAILS_INTERVAL_MS = 1_000;

/** Time that a speed test sends test data for. */
export const SPEED_TEST_DURATION_MS = 5_000;

/** Time that the peer gets to confirm a speed test before it counts as unsupported. Peers on older versions never confirm. */
export const SPEED_TEST_READY_TIMEOUT_MS = 3_000;

/** Time after the last test data that the peer gets to report what arrived. */
export const SPEED_TEST_RESULT_TIMEOUT_MS = 10_000;

/** Share of the speed test, 0 to 1, that the send buffer has to stay filled for. Below it, the sending tab limits the speed. */
export const SPEED_TEST_FILLED_SHARE = 0.5;

/** Factor and margin that the round trip time has to grow by under load before a queue on the path counts as the limit. */
export const SPEED_TEST_RTT_GROWTH_FACTOR = 3;
export const SPEED_TEST_RTT_GROWTH_MS = 30;
