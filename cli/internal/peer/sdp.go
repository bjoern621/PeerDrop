package peer

import (
	"strconv"
	"strings"
)

// DefaultMaxMessageSize applies when a description announces no limit.
// It matches the fallback the web client uses.
const DefaultMaxMessageSize = 16 * 1024

// MaxMessageSizeCap is the largest message either side sends, whatever the peer announces.
const MaxMessageSizeCap = 256 * 1024

// Attribute lines a data channel description needs. Everything else is dropped
// so the description fits the signaling frame limit.
var keptAttributes = []string{
	"a=group:BUNDLE",
	"a=ice-ufrag:",
	"a=ice-pwd:",
	"a=ice-options:",
	"a=fingerprint:",
	"a=setup:",
	"a=mid:",
	"a=sctp-port:",
	"a=max-message-size:",
}

// trimSDP drops every line a data channel connection does not need.
// Candidates are trickled over their own messages,
// so the description carries none.
func trimSDP(sdp string) string {
	lines := strings.Split(sdp, "\r\n")
	kept := make([]string, 0, len(lines))

	for _, line := range lines {
		if line == "" {
			continue
		}

		if !strings.HasPrefix(line, "a=") {
			kept = append(kept, line)
			continue
		}

		for _, attribute := range keptAttributes {
			if strings.HasPrefix(line, attribute) {
				kept = append(kept, line)
				break
			}
		}
	}

	return strings.Join(kept, "\r\n") + "\r\n"
}

// maxMessageSizeOf reads the SCTP message limit a description announces.
// The result is capped at MaxMessageSizeCap,
// and an unannounced limit yields DefaultMaxMessageSize.
func maxMessageSizeOf(sdp string) int {
	const attribute = "a=max-message-size:"

	size := DefaultMaxMessageSize

	for _, line := range strings.Split(sdp, "\r\n") {
		if !strings.HasPrefix(line, attribute) {
			continue
		}

		announced, err := strconv.Atoi(strings.TrimSpace(strings.TrimPrefix(line, attribute)))
		if err != nil || announced <= 0 {
			continue
		}

		size = announced
		break
	}

	if size > MaxMessageSizeCap {
		size = MaxMessageSizeCap
	}

	return size
}
