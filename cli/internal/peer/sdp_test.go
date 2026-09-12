package peer

import (
	"encoding/json"
	"strings"
	"testing"
)

const browserOffer = "v=0\r\n" +
	"o=- 4611731400430051336 2 IN IP4 127.0.0.1\r\n" +
	"s=-\r\n" +
	"t=0 0\r\n" +
	"a=group:BUNDLE 0\r\n" +
	"a=extmap-allow-mixed\r\n" +
	"a=msid-semantic: WMS\r\n" +
	"m=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n" +
	"c=IN IP4 0.0.0.0\r\n" +
	"a=candidate:1 1 udp 2113937151 192.0.2.1 51234 typ host\r\n" +
	"a=ice-ufrag:abcd\r\n" +
	"a=ice-pwd:0123456789abcdef0123456789\r\n" +
	"a=ice-options:trickle\r\n" +
	"a=fingerprint:sha-256 11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00\r\n" +
	"a=setup:actpass\r\n" +
	"a=mid:0\r\n" +
	"a=sctp-port:5000\r\n" +
	"a=max-message-size:262144\r\n"

func TestTrimSDPKeepsTheLinesAConnectionNeeds(t *testing.T) {
	trimmed := trimSDP(browserOffer)

	required := []string{
		"v=0",
		"m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
		"c=IN IP4 0.0.0.0",
		"a=ice-ufrag:abcd",
		"a=ice-pwd:0123456789abcdef0123456789",
		"a=fingerprint:sha-256",
		"a=setup:actpass",
		"a=mid:0",
		"a=sctp-port:5000",
	}

	for _, line := range required {
		if !strings.Contains(trimmed, line) {
			t.Errorf("trimmed description lost %q", line)
		}
	}
}

func TestTrimSDPDropsCandidatesAndUnusedAttributes(t *testing.T) {
	trimmed := trimSDP(browserOffer)

	for _, line := range []string{"a=candidate:", "a=extmap-allow-mixed", "a=msid-semantic"} {
		if strings.Contains(trimmed, line) {
			t.Errorf("trimmed description still carries %q", line)
		}
	}
}

func TestTrimmedDescriptionFitsTheSignalingFrame(t *testing.T) {
	frame, err := json.Marshal(map[string]any{
		"type": "sdp",
		"msg": map[string]any{
			"remoteToken": "kuzok",
			"description": map[string]string{"type": "offer", "sdp": trimSDP(browserOffer)},
		},
	})
	if err != nil {
		t.Fatal(err)
	}

	if len(frame) > 1024 {
		t.Errorf("frame of %d bytes exceeds the 1024 byte limit", len(frame))
	}
}

func TestMaxMessageSizeOfCapsTheAnnouncedValue(t *testing.T) {
	if got := maxMessageSizeOf("a=max-message-size:1073741824\r\n"); got != MaxMessageSizeCap {
		t.Errorf("got %d, want %d", got, MaxMessageSizeCap)
	}

	if got := maxMessageSizeOf(browserOffer); got != 262144 {
		t.Errorf("got %d, want 262144", got)
	}
}

func TestMaxMessageSizeOfFallsBackWhenUnannounced(t *testing.T) {
	if got := maxMessageSizeOf("v=0\r\n"); got != DefaultMaxMessageSize {
		t.Errorf("got %d, want %d", got, DefaultMaxMessageSize)
	}
}
