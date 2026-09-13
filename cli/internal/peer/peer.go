// Package peer holds the WebRTC connection to one remote peer.
package peer

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/pion/logging"
	"github.com/pion/webrtc/v4"
)

// InitChannelLabel is the channel the polite side opens to start negotiation.
// It carries no data.
const InitChannelLabel = "init"

// SendFunc hands a signaling message to the server.
type SendFunc func(messageType string, msg any) error

// Peer is the WebRTC connection to one remote token.
type Peer struct {
	connection  *webrtc.PeerConnection
	remoteToken string
	// The polite side opens the first channel and makes the offer.
	// It is the side with the lexicographically smaller token.
	polite bool
	send   SendFunc

	mu                   sync.Mutex
	onFileChannel        func(*webrtc.DataChannel)
	onConnectionState    func(webrtc.PeerConnectionState)
	maxMessageSize       int
	remoteDescriptionSet bool
	pendingCandidates    []webrtc.ICECandidateInit
}

// New builds the connection without negotiating. Start begins the handshake.
func New(iceServers []webrtc.ICEServer, localToken, remoteToken string) (*Peer, error) {
	settings := webrtc.SettingEngine{}

	// The progress display owns stderr. PION_LOG_ERROR and its siblings still
	// turn the WebRTC log back on per scope.
	logs := logging.NewDefaultLoggerFactory()
	logs.DefaultLogLevel = logging.LogLevelDisabled
	settings.LoggerFactory = logs

	// TURN over TLS runs on TCP, which the default network types exclude.
	settings.SetNetworkTypes([]webrtc.NetworkType{
		webrtc.NetworkTypeUDP4,
		webrtc.NetworkTypeUDP6,
		webrtc.NetworkTypeTCP4,
		webrtc.NetworkTypeTCP6,
	})

	api := webrtc.NewAPI(webrtc.WithSettingEngine(settings))

	connection, err := api.NewPeerConnection(webrtc.Configuration{ICEServers: iceServers})
	if err != nil {
		return nil, err
	}

	return &Peer{
		connection:     connection,
		remoteToken:    remoteToken,
		polite:         localToken < remoteToken,
		maxMessageSize: DefaultMaxMessageSize,
	}, nil
}

// OnFileChannel registers the handler for channels the peer opens. The init channel never reaches it.
func (p *Peer) OnFileChannel(handler func(*webrtc.DataChannel)) {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.onFileChannel = handler
}

// OnConnectionState registers the handler for connection state changes.
func (p *Peer) OnConnectionState(handler func(webrtc.PeerConnectionState)) {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.onConnectionState = handler
}

func (p *Peer) fileChannelHandler() func(*webrtc.DataChannel) {
	p.mu.Lock()
	defer p.mu.Unlock()

	return p.onFileChannel
}

func (p *Peer) connectionStateHandler() func(webrtc.PeerConnectionState) {
	p.mu.Lock()
	defer p.mu.Unlock()

	return p.onConnectionState
}

// Start wires the handlers and, on the polite side, sends the first offer.
func (p *Peer) Start(send SendFunc) error {
	p.send = send

	p.connection.OnICECandidate(func(candidate *webrtc.ICECandidate) {
		if candidate == nil {
			return
		}

		_ = p.send(signalingTypeICECandidate, iceCandidateMessage{
			RemoteToken:  p.remoteToken,
			ICECandidate: candidate.ToJSON(),
		})
	})

	p.connection.OnDataChannel(func(channel *webrtc.DataChannel) {
		if channel.Label() == InitChannelLabel {
			return
		}

		if handler := p.fileChannelHandler(); handler != nil {
			handler(channel)
		}
	})

	p.connection.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		if handler := p.connectionStateHandler(); handler != nil {
			handler(state)
		}
	})

	if !p.polite {
		return nil
	}

	if _, err := p.connection.CreateDataChannel(InitChannelLabel, nil); err != nil {
		return err
	}

	offer, err := p.connection.CreateOffer(nil)
	if err != nil {
		return err
	}

	return p.setAndSendLocalDescription(offer)
}

// HandleSDP applies a description from the peer and answers an offer.
func (p *Peer) HandleSDP(raw json.RawMessage) error {
	var description webrtc.SessionDescription
	if err := json.Unmarshal(raw, &description); err != nil {
		return fmt.Errorf("could not read the session description from the peer: %w", err)
	}

	// The impolite side never offers, so an offer arriving mid-handshake is a
	// collision it wins by ignoring the offer.
	if description.Type == webrtc.SDPTypeOffer && !p.polite &&
		p.connection.SignalingState() != webrtc.SignalingStateStable {
		return nil
	}

	if err := p.connection.SetRemoteDescription(description); err != nil {
		return err
	}

	p.mu.Lock()
	p.maxMessageSize = maxMessageSizeOf(description.SDP)
	p.remoteDescriptionSet = true
	pending := p.pendingCandidates
	p.pendingCandidates = nil
	p.mu.Unlock()

	for _, candidate := range pending {
		_ = p.connection.AddICECandidate(candidate)
	}

	if description.Type != webrtc.SDPTypeOffer {
		return nil
	}

	answer, err := p.connection.CreateAnswer(nil)
	if err != nil {
		return err
	}

	return p.setAndSendLocalDescription(answer)
}

// HandleICECandidate applies a candidate from the peer.
// Candidates arriving before the description are held back,
// because adding one needs a remote description.
func (p *Peer) HandleICECandidate(raw json.RawMessage) error {
	var candidate webrtc.ICECandidateInit
	if err := json.Unmarshal(raw, &candidate); err != nil {
		return fmt.Errorf("could not read the ICE candidate from the peer: %w", err)
	}

	p.mu.Lock()
	if !p.remoteDescriptionSet {
		p.pendingCandidates = append(p.pendingCandidates, candidate)
		p.mu.Unlock()
		return nil
	}
	p.mu.Unlock()

	return p.connection.AddICECandidate(candidate)
}

// NewFileChannel opens an unordered reliable channel for one file transfer.
func (p *Peer) NewFileChannel(label string) (*webrtc.DataChannel, error) {
	ordered := false
	return p.connection.CreateDataChannel(label, &webrtc.DataChannelInit{Ordered: &ordered})
}

// MaxMessageSize is the largest message the peer accepts, capped at MaxMessageSizeCap.
func (p *Peer) MaxMessageSize() int {
	p.mu.Lock()
	defer p.mu.Unlock()

	return p.maxMessageSize
}

// Close tears the connection down.
func (p *Peer) Close() error {
	return p.connection.Close()
}

func (p *Peer) setAndSendLocalDescription(description webrtc.SessionDescription) error {
	if err := p.connection.SetLocalDescription(description); err != nil {
		return err
	}

	local := p.connection.LocalDescription()

	return p.send(signalingTypeSDP, sdpMessage{
		RemoteToken: p.remoteToken,
		Description: webrtc.SessionDescription{
			Type: local.Type,
			SDP:  trimSDP(local.SDP),
		},
	})
}

// Message types and shapes are spelled out here so the WebRTC connection stays
// independent of the transport that carries the signaling.
const (
	signalingTypeSDP          = "sdp"
	signalingTypeICECandidate = "ice-candidate"
)

type sdpMessage struct {
	RemoteToken string                    `json:"remoteToken"`
	Description webrtc.SessionDescription `json:"description"`
}

type iceCandidateMessage struct {
	RemoteToken  string                  `json:"remoteToken"`
	ICECandidate webrtc.ICECandidateInit `json:"iceCandidate"`
}
