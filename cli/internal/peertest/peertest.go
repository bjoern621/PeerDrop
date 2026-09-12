// Package peertest wires two peers to each other in place of a signaling server.
package peertest

import (
	"encoding/json"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/pion/webrtc/v4"

	"github.com/bjoern621/PeerDrop/cli/internal/peer"
)

// SignalingFrameLimit is the frame size the signaling server reads in one piece.
const SignalingFrameLimit = 1024

// Pair is two connected peers and the tokens they were given.
type Pair struct {
	Left      *peer.Peer
	Right     *peer.Peer
	LeftToken string
	// RightToken sorts after LeftToken, so Left is the polite side.
	RightToken string
}

// Connect builds two peers, routes their signaling to each other and waits until both are connected.
// Every routed frame is measured against the signaling frame limit.
func Connect(t *testing.T) *Pair {
	t.Helper()

	const leftToken, rightToken = "babab", "kuzok"

	left, err := peer.New(nil, leftToken, rightToken)
	if err != nil {
		t.Fatalf("could not build the left peer: %v", err)
	}

	right, err := peer.New(nil, rightToken, leftToken)
	if err != nil {
		t.Fatalf("could not build the right peer: %v", err)
	}

	leftConnected := make(chan struct{})
	rightConnected := make(chan struct{})

	left.OnConnectionState(closeWhenConnected(leftConnected))
	right.OnConnectionState(closeWhenConnected(rightConnected))

	toRight := newRoute(right)
	toLeft := newRoute(left)

	if err := right.Start(toLeft.send); err != nil {
		t.Fatalf("could not start the right peer: %v", err)
	}

	if err := left.Start(toRight.send); err != nil {
		t.Fatalf("could not start the left peer: %v", err)
	}

	t.Cleanup(func() {
		_ = left.Close()
		_ = right.Close()
		toRight.stop()
		toLeft.stop()

		for _, violation := range append(toRight.oversized(), toLeft.oversized()...) {
			t.Error(violation)
		}
	})

	await(t, leftConnected, "the left peer did not connect")
	await(t, rightConnected, "the right peer did not connect")

	return &Pair{Left: left, Right: right, LeftToken: leftToken, RightToken: rightToken}
}

func closeWhenConnected(connected chan struct{}) func(webrtc.PeerConnectionState) {
	var done bool

	return func(state webrtc.PeerConnectionState) {
		if state == webrtc.PeerConnectionStateConnected && !done {
			done = true
			close(connected)
		}
	}
}

// Await blocks until the channel closes or the test times out.
func Await(t *testing.T, done <-chan struct{}, message string) {
	t.Helper()

	await(t, done, message)
}

func await(t *testing.T, done <-chan struct{}, message string) {
	t.Helper()

	select {
	case <-done:
	case <-time.After(30 * time.Second):
		t.Fatal(message)
	}
}

// route delivers signaling messages to one peer in the order they were sent.
// Handling them on the sender's goroutine would reenter pion's callbacks.
type route struct {
	target   *peer.Peer
	messages chan func()
	done     chan struct{}

	mu         sync.Mutex
	violations []string
}

func newRoute(target *peer.Peer) *route {
	r := &route{target: target, messages: make(chan func(), 64), done: make(chan struct{})}

	go func() {
		defer close(r.done)

		for deliver := range r.messages {
			deliver()
		}
	}()

	return r
}

func (r *route) send(messageType string, msg any) error {
	frame, err := json.Marshal(map[string]any{"type": messageType, "msg": msg})
	if err != nil {
		return err
	}

	if len(frame) > SignalingFrameLimit {
		r.mu.Lock()
		r.violations = append(r.violations,
			fmt.Sprintf("a %s frame of %d bytes exceeds the %d byte limit", messageType, len(frame), SignalingFrameLimit))
		r.mu.Unlock()
	}

	var payload struct {
		Description  json.RawMessage `json:"description"`
		ICECandidate json.RawMessage `json:"iceCandidate"`
	}

	raw, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return err
	}

	target := r.target

	select {
	case r.messages <- func() {
		switch messageType {
		case "sdp":
			_ = target.HandleSDP(payload.Description)
		case "ice-candidate":
			_ = target.HandleICECandidate(payload.ICECandidate)
		}
	}:
	default:
	}

	return nil
}

func (r *route) stop() {
	close(r.messages)
	<-r.done
}

func (r *route) oversized() []string {
	r.mu.Lock()
	defer r.mu.Unlock()

	return append([]string(nil), r.violations...)
}
